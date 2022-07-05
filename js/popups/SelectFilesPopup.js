'use strict';

const
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),

	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	Api = require('%PathToCoreWebclientModule%/js/Api.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),

	CFilesView = require('modules/FilesWebclient/js/views/CFilesView.js')
;

/**
 * @constructor
 */
function CSelectFilesPopup()
{
	CAbstractPopup.call(this);

	this.filesView = new CFilesView(true, false);
	this.filesView.onSelectClickPopupBound = () => {};
	this.filesView.onCreateFolderResponse = function (response, request) {
		if (!response.Result) {
			Api.showErrorByCode(response);
			this.routeFiles(this.storageType(), this.currentPath(), this.searchPattern(), true);
		} else {
			const
				path = `${request.Parameters.Path}/${request.Parameters.FolderName}`,
				storage = request.Parameters.Type
			;
			this.routeFiles(storage, path, '', true);
		}
	}.bind(this.filesView);

	this.isSaving = ko.observable(false);
	this.isSaving.subscribe(function () {
		this.filesView.disableRoute = this.isSaving();
	}, this);

	this.allowCreateFolder = ko.computed(function () {
		return !this.isSaving();
	}, this);
	this.createFolderCommand = Utils.createCommand(this, this.createFolder, this.allowCreateFolder);

	this.allowSelectFolder = ko.computed(function () {
		return !this.isSaving() && (this.filesView.storageType() !== 'shared' || this.filesView.currentPath() !== '');
	}, this);
	this.selectFolderCommand = Utils.createCommand(this, this.selectFolder, this.allowSelectFolder);
}

_.extendOwn(CSelectFilesPopup.prototype, CAbstractPopup.prototype);

CSelectFilesPopup.prototype.PopupTemplate = '%ModuleName%_SelectFilesPopup';

/**
 * @param {array} attachments
 * @param {int} accountId
 */
CSelectFilesPopup.prototype.onOpen = function (attachments, accountId)
{
	const attachmentsDataToUpload = [];
	attachments.forEach(attach => {
		const
			fileData = {
				FileName: attach.fileName(),
				Size: attach.size(),
				Hash: attach.hash(),
				Type: attach.mimeType()
			},
			isFileSizeLessThanUploadLimit = this.filesView.isFileSizeLessThanUploadLimit(fileData)
		;

		if (isFileSizeLessThanUploadLimit) {
			attachmentsDataToUpload.push(fileData);
		}
	});

	if (attachmentsDataToUpload.length === 0) {
		this.closePopup();
		return;
	}

	this.attachmentsData = attachmentsDataToUpload;
	this.accountId = accountId;

	this.filesView.onShow();
	this.filesView.routeFiles('personal', '');
	this.filesView.storages.subscribe(function () {
		const storages = this.filesView.storages();
		if (storages.find(storage => storage.type === 'encrypted')) {
			this.filesView.storages(storages.filter(storage => storage.type !== 'encrypted'));
		}
	}, this);
};

CSelectFilesPopup.prototype.onBind = function ()
{
	this.filesView.onBind(this.$popupDom);
};

CSelectFilesPopup.prototype.selectFolder = function ()
{
	const hashes = [];

	this.attachmentsData.forEach(fileData => {
		const isFileCanBeUploaded = this.filesView.isFileCanBeUploaded(fileData);
		if (isFileCanBeUploaded) {
			this.filesView.onFileUploadSelect(fileData.Hash, fileData);
			this.filesView.onFileUploadStart(fileData.Hash);
			this.filesView.onFileUploadProgress(fileData.Hash, fileData.Size * 0.2, fileData.Size);
			hashes.push(fileData.Hash);
		}
	});

	if (hashes.length > 0) {
		this.saveToFolder(this.filesView.storageType(), this.filesView.currentPath(), this.accountId, hashes);
	}
};

CSelectFilesPopup.prototype.saveToFolder = function(storage, path, accountId, hashes)
{
	Screens.showLoading(TextUtils.i18n('COREWEBCLIENT/INFO_LOADING'));
	const
		parameters = {
			'AccountID': accountId,
			'Attachments': hashes,
			'Storage': storage,
			'Path': path
		},
		responseHandler = response => {
			this.isSaving(false);
			Screens.hideLoading();
			if (response.Result) {
				const headerItemView = ModulesManager.run('FilesWebclient', 'getHeaderItem');
				if (headerItemView && headerItemView.item) {
					headerItemView.item.recivedAnim(true);
				}
				this.attachmentsData.forEach(fileData => {
					this.filesView.onFileUploadComplete(fileData.Hash, true, { Result: true });
				});
				if (this.filesView.uploadingFiles().length === 0) {
					const
						filesCount = this.attachmentsData.length,
						reportLang = '%MODULENAME%/REPORT_FILES_SAVED_SUCCESSFULLY_PLURAL',
						reportText = TextUtils.i18n(reportLang, null, null, filesCount)
					;
					Screens.showReport(reportText);
				}
				setTimeout(() => { this.closePopup(); }, 1000);
			} else {
				Api.showErrorByCode(response);
			}
		}
	;
	this.isSaving(true);
	Ajax.send('%ModuleName%', 'Save', parameters, responseHandler);
};

CSelectFilesPopup.prototype.createFolder = function ()
{
	this.filesView.executeCreateFolder();
};

module.exports = new CSelectFilesPopup();

'use strict';

const
	_ = require('underscore'),
	ko = require('knockout'),

	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),

	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	Api = require('%PathToCoreWebclientModule%/js/Api.js'),
	App = require('%PathToCoreWebclientModule%/js/App.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),
	CJua = require('%PathToCoreWebclientModule%/js/CJua.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	UserSettings = require('%PathToCoreWebclientModule%/js/Settings.js'),

	CFilesView = require('modules/FilesWebclient/js/views/CFilesView.js'),

	isCoreParanoidModuleEnabled = ModulesManager.run('CoreParanoidEncryptionWebclientPlugin', 'isEnabled')
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
	this.initUploader();

	this.attachmentsData = attachments.map(attach => {
		return {
			attach,
			FileName: attach.fileName(),
			Size: attach.size(),
			Hash: attach.hash(),
			Type: attach.mimeType()
		};
	});
	this.accountId = accountId;

	this.filesView.onShow();
	this.filesView.routeFiles('personal', '');
};

CSelectFilesPopup.prototype.onBind = function ()
{
	this.filesView.onBind(this.$popupDom);
};

CSelectFilesPopup.prototype.hideLoading = function ()
{
	this.isSaving(false);
	Screens.hideLoading();
};

CSelectFilesPopup.prototype.onClose = function ()
{
	this.hideLoading();
};

CSelectFilesPopup.prototype.selectFolder = function ()
{
	const filesData = this.attachmentsData.filter(fileData => this.filesView.isFileCanBeUploaded(fileData));
	if (filesData.length > 0) {
		const
			storageType = this.filesView.storageType(),
			currentPath = this.filesView.currentPath(),
			saveToFolderArgs = [storageType, currentPath, this.accountId, filesData],
			encryptAndSaveHandler = () => { this.encryptAndSaveToFolder(filesData); },
			saveHandler = () => { this.saveToFolder(...saveToFolderArgs); },
			cancelHandler = () => { this.closePopup(); }
		;
		if (isCoreParanoidModuleEnabled) {
			// get ConfirmEncryptionPopup every time in case the EnableInPersonalStorage setting has changed
			const ConfirmEncryptionPopup = ModulesManager.run('CoreParanoidEncryptionWebclientPlugin', 'getConfirmEncryptionPopup');
			if (this.filesView.storageType() === 'encrypted') {
				encryptAndSaveHandler();
			} else if (this.filesView.storageType() === 'personal' && ConfirmEncryptionPopup) {
				Popups.showPopup(ConfirmEncryptionPopup, [
					encryptAndSaveHandler,
					saveHandler,
					cancelHandler,
					filesData.length,
					filesData.map(fileData => fileData.FileName)
				]);
			} else {
				saveHandler();
			}
		} else {
			saveHandler();
		}
	}
};

CSelectFilesPopup.prototype.saveToFolder = function(storage, path, accountId, filesData)
{
	filesData.forEach(fileData => {
		this.filesView.onFileUploadSelect(fileData.Hash, fileData);
		this.filesView.onFileUploadStart(fileData.Hash);
		this.filesView.onFileUploadProgress(fileData.Hash, fileData.Size * 0.2, fileData.Size);
	});
	const
		hashes = filesData.map(fileData => fileData.Hash),
		parameters = {
			'AccountID': accountId,
			'Attachments': hashes,
			'Storage': storage,
			'Path': path
		},
		responseHandler = response => {
			this.hideLoading();
			if (response.Result) {
				this.attachmentsData.forEach(fileData => {
					this.filesView.onFileUploadComplete(fileData.Hash, true, { Result: true });
				});
				this.onFileUploadComplete();
			} else {
				Api.showErrorByCode(response);
			}
		}
	;
	Screens.showLoading(TextUtils.i18n('COREWEBCLIENT/INFO_LOADING'));
	this.isSaving(true);
	Ajax.send('%ModuleName%', 'Save', parameters, responseHandler);
};

CSelectFilesPopup.prototype.onFileUploadComplete = function ()
{
	if (this.filesView.uploadingFiles().length > 0) {
		return;
	}

	const headerItemView = ModulesManager.run('FilesWebclient', 'getHeaderItem');
	if (headerItemView && headerItemView.item) {
		headerItemView.item.recivedAnim(true);
	}

	const
		filesCount = this.attachmentsData.length,
		reportLang = '%MODULENAME%/REPORT_FILES_SAVED_SUCCESSFULLY_PLURAL',
		reportText = TextUtils.i18n(reportLang, null, null, filesCount)
	;
	Screens.showReport(reportText);
	setTimeout(() => { this.closePopup(); }, 1000);

	this.hideLoading();
};

CSelectFilesPopup.prototype.encryptAndSaveToFolder = function(filesData)
{
	filesData.forEach(fileData => {
		this.filesView.onFileUploadSelect(fileData.Hash, fileData);
		this.filesView.onFileUploadStart(fileData.Hash);
		this.filesView.onFileUploadProgress(fileData.Hash, fileData.Size * 0.1, fileData.Size);
	});
	Screens.showLoading(TextUtils.i18n('COREWEBCLIENT/INFO_LOADING'));
	this.isSaving(true);
	const attaches = filesData.map(fileData => fileData.attach);
	attaches.forEach(attach => {
		const downloadUrl = attach.getActionUrl('download');
		jQuery.ajax({
			url: downloadUrl,
			cache: false,
			xhrFields: {
				responseType: 'blob'
			},
			success: blobData => {
				this.encryptBlob(attach, blobData);
			},
			error: function (error) {
				this.hideLoading();
				this.filesView.onFileUploadComplete(attach.hash(), false, { Result: false });
			}
		});
	});
};

CSelectFilesPopup.prototype.encryptBlob = function(attach, blobData)
{
	this.oJua.addFile(attach.hash(), {
		File: blobData,
		FileName: attach.fileName(),
		Folder: '',
		Size: blobData.size,
		Type: blobData.type,
		EncryptWithoutConfirm: true
	});
	const file = this.filesView.getUploadFileByUid(attach.hash());
	if (file) {
		this.filesView.onFileUploadProgress(attach.hash(), file.size() * 0.2, file.size());
	}
};

CSelectFilesPopup.prototype.initUploader = function ()
{
	if (!this.oJua) {
		this.oJua = new CJua({
			'action': '?/Api/',
			'name': 'jua-uploader',
			'queueSize': 2,
			'clickElement': null,
			'hiddenElementsPosition': UserSettings.IsRTL ? 'right' : 'left',
			'dragAndDropElement': null,
			'disableAjaxUpload': false,
			'disableFolderDragAndDrop': true,
			'disableDragAndDrop': true,
			'hidden': _.extendOwn({
				'Module': 'Files',
				'Method': 'UploadFile',
				'Parameters':  file => {
					return JSON.stringify({
						'Type': this.filesView.storageType(),
						'SubPath': '',
						'Path': this.filesView.currentPath(),
						'Overwrite': false
					});
				}
			}, App.getCommonRequestParameters())
		});

		this.oJua
			.on('onProgress', (fileUid, uploadedSize, fileSize) => {
				let percent = uploadedSize / fileSize;
				if (percent < 0.2) {
					percent = 0.2;
				}
				this.filesView.onFileUploadProgress(fileUid, fileSize * percent, fileSize);
			})
			.on('onSelect', this.filesView.onFileUploadSelect.bind(this.filesView))
			.on('onStart', (fileUid) => {
				this.filesView.onFileUploadStart(fileUid);
				const file = this.filesView.getUploadFileByUid(fileUid);
				if (file) {
					this.filesView.onFileUploadProgress(fileUid, file.size() * 0.2, file.size());
				}
			})
			.on('onComplete', (fileUid, isResponseReceived, result) => {
				this.filesView.onFileUploadComplete(fileUid, isResponseReceived, result);
				this.onFileUploadComplete();
			})
			.on('onCancel', (fileUid) => {
				this.filesView.onCancelUpload(fileUid);
				if (this.filesView.uploadingFiles().length === 0) {
					this.hideLoading();
				}
			})
		;
	}
};

CSelectFilesPopup.prototype.createFolder = function ()
{
	this.filesView.executeCreateFolder();
};

module.exports = new CSelectFilesPopup();

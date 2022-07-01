'use strict';

const
	_ = require('underscore'),
	ko = require('knockout'),

	Utils = require('%PathToCoreWebclientModule%/js/utils/Common.js'),

	Api = require('%PathToCoreWebclientModule%/js/Api.js'),
	CAbstractPopup = require('%PathToCoreWebclientModule%/js/popups/CAbstractPopup.js'),

	CFilesView = require('modules/FilesWebclient/js/views/CFilesView.js')
;

/**
 * @constructor
 */
function CSelectFilesPopup()
{
	CAbstractPopup.call(this);

	this.callbackHandler = () => {};

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

	this.allowSelectFolder = ko.computed(function () {
		return this.filesView.storageType() !== 'shared' || this.filesView.currentPath() !== '';
	}, this);
	this.selectFolderCommand = Utils.createCommand(this, this.selectFolder, this.allowSelectFolder);
}

_.extendOwn(CSelectFilesPopup.prototype, CAbstractPopup.prototype);

CSelectFilesPopup.prototype.PopupTemplate = '%ModuleName%_SelectFilesPopup';

/**
 * @param {function} callbackHandler
 */
CSelectFilesPopup.prototype.onOpen = function (callbackHandler)
{
	this.callbackHandler = _.isFunction(callbackHandler) ? callbackHandler : () => {};

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
	this.callbackHandler(this.filesView.storageType(), this.filesView.currentPath());
	this.closePopup();
};

CSelectFilesPopup.prototype.createFolder = function ()
{
	this.filesView.executeCreateFolder();
};

module.exports = new CSelectFilesPopup();

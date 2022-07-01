'use strict';

const
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),

	Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
	Api = require('%PathToCoreWebclientModule%/js/Api.js'),
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),

	SelectFilesPopup = require('modules/%ModuleName%/js/popups/SelectFilesPopup.js')
;

module.exports = {
	openSelectFilesPopup: function (accountId, hashes)
	{
		const callbackHandler = (storage, path) => {
			this.saveToFolder(storage, path, accountId, hashes);
		};
		Popups.showPopup(SelectFilesPopup, [callbackHandler]);
	},

	saveToFolder: function (storage, path, accountId, hashes)
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
				Screens.hideLoading();
				if (response.Result) {
					const headerItemView = ModulesManager.run('FilesWebclient', 'getHeaderItem');
					if (headerItemView && headerItemView.item) {
						headerItemView.item.recivedAnim(true);
					}
				} else {
					Api.showErrorByCode(response);
				}
			}
		;
		Ajax.send('%ModuleName%', 'Save', parameters, responseHandler);
	}
};

'use strict';

module.exports = function (appData) {
	const
		TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),

		App = require('%PathToCoreWebclientModule%/js/App.js'),
		ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js')
	;

	if (!ModulesManager.isModuleEnabled('FilesWebclient')) {
		return null;
	}

	if (App.isUserNormalOrTenant()) {
		return {
			start: function (ModulesManager) {
				App.subscribeEvent('MailWebclient::AddAllAttachmentsDownloadMethod', fAddAllAttachmentsDownloadMethod => {
					fAddAllAttachmentsDownloadMethod({
						'Text': TextUtils.i18n('%MODULENAME%/ACTION_SAVE_ATTACHMENTS_TO_FILES'),
						'Handler': function (accountId, hashes, attachments) {
							const
								Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
								SelectFilesPopup = require('modules/%ModuleName%/js/popups/SelectFilesPopup.js')
							;
							Popups.showPopup(SelectFilesPopup, [attachments, accountId]);
						}
					});
				});
			}
		};
	}

	return null;
};

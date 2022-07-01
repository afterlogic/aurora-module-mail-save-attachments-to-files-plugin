'use strict';

module.exports = function (appData) {
	const
		TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),

		App = require('%PathToCoreWebclientModule%/js/App.js'),
		ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),

		FilesUtils = require('modules/%ModuleName%/js/utils/Files.js')
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
						'Handler': function (accountId, hashes) {
							FilesUtils.openSelectFilesPopup(accountId, hashes);
						}
					});
				});
			}
		};
	}

	return null;
};

'use strict';

module.exports = function (oAppData) {
	var
		TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
		
		Ajax = require('%PathToCoreWebclientModule%/js/Ajax.js'),
		Api = require('%PathToCoreWebclientModule%/js/Api.js'),
		App = require('%PathToCoreWebclientModule%/js/App.js'),
		ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
		Screens = require('%PathToCoreWebclientModule%/js/Screens.js')
	;
	
	if (!ModulesManager.isModuleEnabled('FilesWebclient'))
	{
		return null;
	}
	
	if (App.isUserNormalOrTenant())
	{
		return {
			start: function (ModulesManager) {
				App.subscribeEvent('MailWebclient::AddAllAttachmentsDownloadMethod', function (fAddAllAttachmentsDownloadMethod) {
					fAddAllAttachmentsDownloadMethod({
						'Text': TextUtils.i18n('%MODULENAME%/ACTION_SAVE_ATTACHMENTS_TO_FILES'),
						'Handler': function (iAccountId, aHashes) {
							Screens.showLoading(TextUtils.i18n('COREWEBCLIENT/INFO_LOADING'));
							Ajax.send('%ModuleName%', 'Save', {
								'AccountID': iAccountId,
								'Attachments': aHashes
							}, function (oResponse) {
								Screens.hideLoading();
								if (oResponse.Result)
								{
									var oHeaderItem = ModulesManager.run('FilesWebclient', 'getHeaderItem');
									if (oHeaderItem && oHeaderItem.item)
									{
										oHeaderItem.item.recivedAnim(true);
									}
								}
								else
								{
									Api.showErrorByCode(oResponse);
								}
							});
						}
					});
				});
			}
		};
	}
	
	return null;
};

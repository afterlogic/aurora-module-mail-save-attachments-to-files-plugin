<?php

namespace Aurora\Modules\MailSaveAttachmentsToFilesPlugin;

class Module extends \Aurora\System\Module\AbstractModule
{
	/* 
	 * @var $oApiFileCache \Aurora\System\Managers\Filecache\Manager 
	 */	
	public $oApiFileCache = null;

	public function init() 
	{
		$this->oApiFileCache = \Aurora\System\Api::GetSystemManager('Filecache');
	}	
	
	/**
	 * 
	 * @return boolean
	 */
	public function Save($UserId, $AccountID, $Attachments = array())
	{
		\Aurora\System\Api::checkUserRoleIsAtLeast(\EUserRole::NormalUser);
		
		$oMailModuleDecorator = \Aurora\System\Api::GetModuleDecorator('Mail');
		if ($oMailModuleDecorator)
		{
			$aTempFiles = $oMailModuleDecorator->SaveAttachmentsAsTempFiles($AccountID, $Attachments);
			if (\is_array($aTempFiles))
			{
				$sUUID = \Aurora\System\Api::getUserUUIDById($UserId);
				foreach ($aTempFiles as $sTempName => $aData)
				{
					if (\is_array($aData) && isset($aData[0], $aData[1], $aData[2], $aData[3]))
					{
						$sFileName = (string) $aData[0];
						$rResource = $this->oApiFileCache->getFile($sUUID, $sTempName);
						if ($rResource)
						{
							$aArgs = array(
								'UserId' => $sUUID,
								'Type' => 'personal',
								'Path' => '',
								'Name' => $sFileName,
								'Data' => $rResource,
								'Overwrite' => false
							);
							$mResult = false;
							$this->broadcastEvent(
								'CreateFile', 
								$aArgs,
								$mResult
							);							
						}
					}
				}
			}			
		}
	}
}

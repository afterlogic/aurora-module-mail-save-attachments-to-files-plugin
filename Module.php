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
		$mResult = false;
		\Aurora\System\Api::checkUserRoleIsAtLeast(\Aurora\System\Enums\UserRole::NormalUser);
		
		$oMailModuleDecorator = \Aurora\Modules\Mail\Module::Decorator();
		if ($oMailModuleDecorator)
		{
			$aTempFiles = $oMailModuleDecorator->SaveAttachmentsAsTempFiles($AccountID, $Attachments);
			if (\is_array($aTempFiles))
			{
				$sUUID = \Aurora\System\Api::getUserUUIDById($UserId);
				foreach ($aTempFiles as $sTempName => $sData)
				{
					$aData = \Aurora\System\Api::DecodeKeyValues($sData);
					if (\is_array($aData) && isset($aData['FileName']))
					{
						$sFileName = (string) $aData['FileName'];
						$rResource = $this->oApiFileCache->getFile($sUUID, $sTempName);
						if ($rResource)
						{
							$aArgs = array(
								'UserId' => $sUUID,
								'Type' => 'personal',
								'Path' => '',
								'Name' => $sFileName,
								'Data' => $rResource,
								'Overwrite' => false,
								'RangeType' => 0,
								'Offset' => 0,
								'ExtendedProps' => array()
							);
							\Aurora\System\Api::GetModuleManager()->broadcastEvent(
								'Files',
								'CreateFile', 
								$aArgs,
								$mResult
							);							
						}
					}
				}
			}			
		}
		
		return $mResult;
	}
}

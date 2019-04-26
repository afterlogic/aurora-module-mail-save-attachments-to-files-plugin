<?php
/**
 * This code is licensed under AGPLv3 license or Afterlogic Software License
 * if commercial version of the product was purchased.
 * For full statements of the licenses see LICENSE-AFTERLOGIC and LICENSE-AGPL3 files.
 */

namespace Aurora\Modules\MailSaveAttachmentsToFilesPlugin;

/**
 * @license https://www.gnu.org/licenses/agpl-3.0.html AGPL-3.0
 * @license https://afterlogic.com/products/common-licensing Afterlogic Software License
 * @copyright Copyright (c) 2019, Afterlogic Corp.
 *
 * @package Modules
 */
class Module extends \Aurora\System\Module\AbstractModule
{
	/* 
	 * @var $getFilecacheManager()Manager \Aurora\System\Managers\Filecache 
	 */	
	public $oApiFilecacheManager = null;

	public function getFilecacheManager()
	{
		if ($this->oApiFilecacheManager === null)
		{
			$this->oApiFilecacheManager = new \Aurora\System\Managers\Filecache();
		}

		return $this->oApiFilecacheManager;
	}

	public function init() 
	{
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
						$rResource = $this->getFilecacheManager()->getFile($sUUID, $sTempName);
						if ($rResource)
						{
							$aArgs = array(
								'UserId' => $UserId,
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

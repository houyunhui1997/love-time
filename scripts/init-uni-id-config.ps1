param([string]$WeixinAppSecret = $env:LOVE_TIME_WEIXIN_SECRET)

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetDirectory = Join-Path $projectRoot 'uni_modules\uni-config-center\uniCloud\cloudfunctions\common\uni-config-center\uni-id'
$targetFile = Join-Path $targetDirectory 'config.json'
New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null

if (Test-Path -LiteralPath $targetFile) {
  Write-Host 'uni-id config already exists; no changes were made.'
  exit 0
}

function New-Secret {
  $bytes = [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
  return [Convert]::ToHexString($bytes).ToLowerInvariant()
}

$config = [ordered]@{
  passwordSecret = New-Secret
  tokenSecret = New-Secret
  tokenExpiresIn = 7200
  tokenExpiresThreshold = 3600
  bindTokenToDevice = $false
  'mp-weixin' = [ordered]@{
    tokenExpiresIn = 259200
    tokenExpiresThreshold = 86400
    oauth = [ordered]@{
      weixin = [ordered]@{
        appid = 'wx139760cd10451a17'
        appsecret = $(if ($WeixinAppSecret) { $WeixinAppSecret } else { '请在本机替换为微信小程序AppSecret' })
      }
    }
  }
}

$config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $targetFile -Encoding utf8
Write-Host 'uni-id config created. AppSecret placeholder remains unless LOVE_TIME_WEIXIN_SECRET was supplied.'

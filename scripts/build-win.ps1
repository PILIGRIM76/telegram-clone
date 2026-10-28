# CipherLink Windows Build Script
# Автоматизированная сборка с очисткой зависших процессов и предотвращением блокировок файлов
# Использование: powershell -ExecutionPolicy Bypass -File scripts/build-win.ps1

param(
    [switch]$SkipClean = $false,
    [switch]$VerifyBuild = $true
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

function Write-Log($message, $level = "INFO") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$level] $message" -ForegroundColor (
        switch ($level) {
            "ERROR" { "Red" }
            "WARN"  { "Yellow" }
            "SUCCESS" { "Green" }
            default { "Cyan" }
        }
    )
}

function Kill-Processes {
    Write-Log "Очистка зависших процессов..."
    $processNames = @("node", "electron", "CipherLink")
    foreach ($name in $processNames) {
        try {
            $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
            if ($procs) {
                Write-Log "Завершение процессов: $($procs.Count) x $name" "WARN"
                $procs | Stop-Process -Force -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 500
            }
        } catch {
            Write-Log "Не удалось завершить $name: $($_.Exception.Message)" "WARN"
        }
    }
}

function Clean-Directories {
    Write-Log "Очистка папок сборки..."
    $dirsToClean = @(
        Join-Path $projectRoot "dist"
        Join-Path $projectRoot "dist-electron"
        Join-Path $projectRoot "release"
        Join-Path $projectRoot "release_new"
        Join-Path $projectRoot "release_final"
        Join-Path $projectRoot "release_final"
    )
    foreach ($dir in $dirsToClean) {
        if (Test-Path $dir) {
            try {
                Write-Log "Удаление: $dir"
                Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Log "Не удалось удалить $dir: $($_.Exception.Message)" "WARN"
            }
        }
    }
}

function Check-Icon {
    $iconPath = Join-Path $projectRoot "build/icon.ico"
    if (Test-Path $iconPath) {
        Write-Log "Иконка найдена: $iconPath" "SUCCESS"
        return $true
    } else {
        Write-Log "ИКОНКА НЕ НАЙДЕНА: $iconPath" "WARN"
        Write-Log "Создайте файл build/icon.ico (256x256) или скачайте любой .ico из интернета." "WARN"
        Write-Log "Сборка продолжится с дефолтной иконкой Electron." "WARN"
        return $false
    }
}

function Invoke-Build {
    Write-Log "Запуск npm run build:win..."
    $npmCmd = "npm run build:win"
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $npmCmd" -WorkingDirectory $projectRoot -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -ne 0) {
        throw "Сборка завершилась с ошибкой (код $($process.ExitCode))"
    }
}

function Verify-Build {
    Write-Log "Проверка сборки..."
    $exePath = Join-Path $projectRoot "release\win-unpacked\CipherLink.exe"
    if (-not (Test-Path $exePath)) {
        # Попробуем другие возможные пути
        $altPaths = @(
            Join-Path $projectRoot "release_new\win-unpacked\CipherLink.exe",
            Join-Path $projectRoot "release_final\win-unpacked\CipherLink.exe",
            Join-Path $projectRoot "release\CipherLink 1.0.0.exe"
        )
        foreach ($alt in $altPaths) {
            if (Test-Path $alt) {
                $exePath = $alt
                break
            }
        }
    }
    
    if (-not (Test-Path $exePath)) {
        Write-Log "EXE не найден для проверки" "ERROR"
        return $false
    }
    
    Write-Log "Запуск для проверки: $exePath"
    $proc = Start-Process -FilePath $exePath -ArgumentList "" -PassThru -RedirectStandardOutput (Join-Path $env:TEMP "cipherlink-verify-out.txt") -RedirectStandardError (Join-Path $env:TEMP "cipherlink-verify-err.txt") -WindowStyle Hidden
    
    $startTime = Get-Date
    $timeout = 15
    $success = $false
    
    while ((Get-Date) - $startTime -lt (New-TimeSpan -Seconds $timeout)) {
        Start-Sleep -Seconds 1
        if (Test-Path (Join-Path $env:TEMP "cipherlink-verify-out.txt")) {
            $output = Get-Content (Join-Path $env:TEMP "cipherlink-verify-out.txt") -ErrorAction SilentlyContinue
            if ($output -match "Сервер на порту" -or $output -match "✅ Page loaded successfully") {
                $success = $true
                break
            }
        }
    }
    
    # Убиваем процесс проверки
    try { $proc | Stop-Process -Force } catch {}
    
    if ($success) {
        Write-Log "✅ BUILD VERIFIED SUCCESSFULLY" "SUCCESS"
        return $true
    } else {
        Write-Log "❌ BUILD VERIFICATION FAILED (timeout or no success markers)" "ERROR"
        return $false
    }
}

# ========== MAIN ==========
Write-Log "=== CipherLink Windows Build Started ==="

if (-not $SkipClean) {
    Kill-Processes
    Clean-Directories
}

Check-Icon

try {
    Invoke-Build
    Write-Log "Сборка завершена успешно" "SUCCESS"
    
    if ($VerifyBuild) {
        Verify-Build
    }
} catch {
    Write-Log "ОШИБКА: $($_.Exception.Message)" "ERROR"
    exit 1
}

Write-Log "=== CipherLink Windows Build Completed ===" "SUCCESS"
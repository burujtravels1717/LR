$ports = 3000..3005
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $processes = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $processes) {
            if ($p -gt 0) {
                Write-Host "Killing process $p on port $port"
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
Write-Host "All ports 3000-3005 cleared."
$ports = 3000..3010
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processes) {
        foreach ($pid_val in $processes) {
            Write-Host "Killing process $pid_val on port $port"
            Stop-Process -Id $pid_val -Force -ErrorAction SilentlyContinue
        }
    }
    else {
        # Write-Host "No process found on port $port"
    }
}
Write-Host "All specified ports cleared."

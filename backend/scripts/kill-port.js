const { exec } = require('child_process');
const os = require('os');

const port = process.argv[2] || '3000';

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

// Try a more robust Windows PowerShell approach first, fallback to netstat parsing
(async () => {
  try {
    if (os.platform() === 'win32') {
      // Try PowerShell to find processes holding the port
      try {
        const psCmd = `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Where-Object { $_ -ne $null } | Sort-Object -Unique | ForEach-Object { $_ }"`;
        const { stdout: pidsOut } = await run(psCmd);
        const pids = new Set((pidsOut || '').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && /^\d+$/.test(s) && s !== String(process.pid)));
        if (pids.size > 0) {
          for (const pid of pids) {
            console.log(`Killing PID ${pid} using port ${port} (PowerShell)`);
            const { err, stderr } = await run(`taskkill /PID ${pid} /F`);
            if (err) console.error(`Failed to kill PID ${pid}:`, stderr || err.message);
            else console.log(`Killed PID ${pid}`);
          }
          process.exit(0);
        }
      } catch (e) {
        console.error('PowerShell port lookup failed, continuing to other checks:', e && e.message ? e.message : e);
      }

      // Also try to find node processes by command line (ts-node-dev / src/main.ts) and kill them
      try {
        const psCmd2 = `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'ts-node-dev|src\\\\main.ts|node' } | Select-Object ProcessId, CommandLine | ForEach-Object { $_.ProcessId + '::' + ($_.CommandLine -replace '\\r', '') }"`;
        const { stdout: procOut } = await run(psCmd2);
        const candidates = (procOut || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        for (const line of candidates) {
          const [pidStr, cmd] = line.split('::');
          const pid = pidStr && pidStr.trim();
          if (pid && /^\d+$/.test(pid) && pid !== String(process.pid)) {
            console.log(`Killing candidate PID ${pid} (cmd: ${cmd})`);
            const { err, stderr } = await run(`taskkill /PID ${pid} /F`);
            if (err) console.error(`Failed to kill PID ${pid}:`, stderr || err.message);
            else console.log(`Killed PID ${pid}`);
          }
        }
      } catch (e) {
        // ignore, will fallback
      }
    }

    const { stdout } = await run('netstat -ano');
    const lines = stdout.split(/\r?\n/);
    const pids = new Set();
    for (const line of lines) {
      if (!line) continue;
      if (line.includes(':' + port)) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== String(process.pid)) pids.add(pid);
      }
    }

    if (pids.size === 0) {
      console.log(`No process using port ${port}`);
      process.exit(0);
    }

    for (const pid of pids) {
      console.log(`Killing PID ${pid} using port ${port}...`);
      const { err, stderr } = await run(`taskkill /PID ${pid} /F`);
      if (err) {
        console.error(`Failed to kill PID ${pid}:`, stderr || err.message);
      } else {
        console.log(`Killed PID ${pid}`);
      }
    }
    // Wait for the port to become free (poll netstat) to avoid race with restarts
    const waitForFree = async (timeoutMs = 5000, intervalMs = 250) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const { stdout: after } = await run('netstat -ano');
        const still = (after || '').split(/\r?\n/).some((line) => line.includes(':' + port));
        if (!still) return true;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return false;
    };

    const freed = await waitForFree(5000, 300);
    if (freed) {
      console.log(`Port ${port} is now free`);
    } else {
      console.warn(`Port ${port} still appears in use after waiting`);
    }
  } catch (e) {
    console.error('Error running port killer:', e.message || e);
  }
})();

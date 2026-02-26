import os
import signal

pid = 21000
try:
    os.kill(pid, signal.SIGTERM)
    print(f"Killed process {pid}")
except:
    print(f"Process {pid} not found or already terminated")

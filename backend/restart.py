import subprocess, time, os

# Kill server
result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
for line in result.stdout.split('\n'):
    if ':8001' in line and 'LISTENING' in line:
        pid = line.split()[-1]
        os.system(f'taskkill /F /PID {pid}')
        print(f'Killed PID {pid}')
        break

time.sleep(3)

# Start server
subprocess.Popen(
    ['python', '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8001'],
    stdout=open('server_restart.log', 'w'),
    stderr=subprocess.STDOUT
)
print('Server restarted')
time.sleep(5)

Setup using a fresh Conda environment. Works on macOS and Windows (with Anaconda/Miniconda installed).

Open a terminal/Anaconda Prompt

macOS: open Terminal.
Windows: open “Anaconda Prompt” (installed with Anaconda/Miniconda).
Create and activate a new Conda env with Node

conda create -y -n cricket nodejs -c conda-forge

Activate it:

macOS: conda activate cricket
Windows: conda activate cricket

Check: node -v and npm -v should print versions.

Go to the project folder

macOS: cd /Users/pedrogonzalez/Desktop/Cricket-Tools
Windows example: cd %USERPROFILE%\Desktop\Cricket-Tools (adjust path if different).

Install app dependencies (one time)
npm install

Wait for it to finish; it may take a minute.
Run the app (development mode for easiest use)
npm run dev

Keep this window open; it’s the server. You’ll see “serving on port 5001” when ready.
Find your computer’s local IP (needed for phones to connect)

macOS Wi‑Fi: in the same terminal, run ifconfig /check en0

Windows: in Anaconda Prompt, run ipconfig and look for “IPv4 Address” under your active adapter (e.g., Wi‑Fi).

Note the IP (e.g., 192.168.1.12).

Connect from phones/tablets on the same Wi‑Fi
On each device’s browser, enter http://<your-ip>:5000/
Example: http://192.168.1.12:5001/

Use the app normally (Conductor/Player pages, MP3 sync, etc.).
Allow firewall prompt

If macOS or Windows asks to allow incoming connections for Node/Terminal, click “Allow.”
Optional “quieter” run (after step 4):
npm run build

PORT=5001 NODE_ENV=production npm start (Windows: set PORT=5001 && set NODE_ENV=production && npm start)

Whenever you want to use the app again:

Open Terminal/Anaconda Prompt.

conda activate cricket
cd into the project folder.
npm run dev

Connect via http://<your-ip>:5001/ from your devices.

If you need to run it in a different port: PORT=5002 npm run dev

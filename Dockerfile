FROM mcr.microsoft.com/node:22-windowsservercore-ltsc2022

# 0. Use PowerShell for RUN
SHELL ["powershell", "-NoProfile", "-Command", "$ErrorActionPreference = 'Stop';"]

# 1. Install AD module
RUN Install-WindowsFeature RSAT-AD-PowerShell

# 2. Set working dir
WORKDIR C:\app

# 3. Copy & install Node deps
COPY package*.json ./
RUN npm ci --only=production

# 4. Copy app code
COPY . .

# 5. Expose port and launch
EXPOSE 3000
CMD ["node", "index.js"]

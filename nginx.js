/*
EC2 Deployment Steps

1. Update system packages
-------------------------
sudo apt update
sudo apt upgrade -y

2. Install Node.js, NPM, Git, and Nginx
---------------------------------------
# Install curl if not present
sudo apt install -y curl

# Get Node.js setup (using Node 20.x here as an example)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install packages
sudo apt install -y nodejs git nginx

3. Install PM2 globally
-----------------------
sudo npm install -g pm2

4. Clone the repository and install dependencies
------------------------------------------------
# Replace with your actual repository URL
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>

# Install npm packages
npm install

5. Setup Environment Variables (.env file)
------------------------------------------
# Create the .env file
nano .env

# Paste the following into the .env file:
# --- .env content start ---
MONGODB_URI=mongodb+srv://ustaadji:Version26%401228@versionevents.mju7wlv.mongodb.net/cloudtest?retryWrites=true&w=majority
PORT=3000
# --- .env content end ---

6. Start the server with PM2
----------------------------
pm2 start server.js --name "app"
pm2 save
pm2 startup

7. Configure Nginx
------------------
# Open a new nginx config file
sudo nano /etc/nginx/sites-available/app-config

# Paste the following basic Nginx configuration:
# --- nginx config start ---
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
# --- nginx config end ---

8. Enable the new Nginx config and remove default
-------------------------------------------------
# Create a symlink to enable your config
sudo ln -s /etc/nginx/sites-available/app-config /etc/nginx/sites-enabled/

# Remove the default Nginx configuration
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration for any syntax errors
sudo nginx -t

# Restart Nginx to apply all the changes
sudo systemctl restart nginx
*/

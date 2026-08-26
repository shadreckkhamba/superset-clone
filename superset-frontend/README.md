 # Superset Dashboard with Custom Charts

## How to use this repo

1. Clone the project:
   ```
   git clone <repository-url>
   cd superset
   ```

1. Build and start Superset:
   ```
   docker compose up --build
   ```
   To restart ; docker compose restart superset_node

3. Clean Docker storage and rebuild:
   ```
   docker system prune -f
   docker compose up --build
   ```

4. (If you need to rebuild only the frontend):
   ```
   cd superset-frontend
   npm install
   npm run build
   ```

5. To change the IP that Nginx points to and update Superset config:

   - Edit the Nginx config file (`/etc/nginx/sites-available/superset`):
     ```
     proxy_pass http://<NEW_SUPerset_IP>:8088;
     ```

   - Edit `superset_config.py` (usually in your Docker build ):
     ```
     SUPERSET_WEBSERVER_BASEURL = "http://<nginx-ip>"
     ```

6. Test and reload Nginx:
   ```
   sudo nginx -t
   sudo systemctl reload nginx
   ```
7. Customize charts layout in superset-frontend dir
   ```
   plugins dir
   ```
8. To connect Superset to your backend MySQL database, go to Settings → Database (or Database connection), then in the Basic     section enter the database name and set the SQLAlchemy URI to:(xxxxxx) is for the db passwd
   ```
   mysql+mysqldb://superset:XXXXXXXXXX@172.17.0.1:3306/billing_import.
  ```

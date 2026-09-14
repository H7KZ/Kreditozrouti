-- Read-only role Grafana uses for product panels. Run by deploy.sh with -v pw=... -v db=...
SELECT 'CREATE ROLE grafana_ro LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grafana_ro')\gexec
ALTER ROLE grafana_ro WITH LOGIN PASSWORD :'pw';
GRANT CONNECT ON DATABASE :"db" TO grafana_ro;
GRANT USAGE ON SCHEMA public TO grafana_ro;
GRANT SELECT ON website, website_event, session TO grafana_ro;

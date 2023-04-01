# Stella - Tool for composing diagrams and saving as SVG / FabricJS JSON files

## Source
- Git: https://github.com/katzemeo/stella.git

### Browser UI (client)
> http://localhost:8000/public/index.html

### Notes - Downloading external resources for air-gapped environments
- curl https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css --output static/css/bootstrap.css
- curl https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js --output static/bootstrap.bundle.min.js
- curl https://fonts.googleapis.com/icon?family=Material+Icons --output static/css/MaterialIcons.css
- curl https://fonts.gstatic.com/s/materialicons/v139/flUhRq6tzZclQEJ-Vdg-IuiaDsNZ.ttf --output static/css/materialicons.ttf
- curl https://unpkg.com/fabric@5.3.0/dist/fabric.min.js --output static/fabric.min.js

Manually edit MaterialIcons.css and update link to "materialicons.ttf" as appropriate.

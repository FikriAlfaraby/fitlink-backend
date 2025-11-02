# Build Configuration Notes

## HTML Template Location

The invoice HTML template is stored in the **root project folder** for simplicity.

### Template Location

```
fitlink-backend/
├── templates/
│   └── invoice-template.html    ← Invoice template here
├── src/
├── dist/
└── package.json
```

### Why Root Folder?

Storing the template in the root folder has several advantages:

1. **No build configuration needed** - No need to configure NestJS to copy assets
2. **Simpler deployment** - Template is always accessible regardless of build process
3. **Easy to edit** - Can modify template without rebuilding
4. **Works in all environments** - Development, production, and Docker containers

### How It Works

The service uses `process.cwd()` to read the template from the root folder:

```typescript
const templatePath = path.join(process.cwd(), 'templates', 'invoice-template.html');
let htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
```

### Verification

Verify the template exists:

```bash
ls -la templates/invoice-template.html
```

### Editing the Template

1. Edit `templates/invoice-template.html` directly
2. **No rebuild required** - Changes take effect immediately
3. Restart the server if running in production mode

### Deployment Notes

When deploying, ensure the `templates/` folder is included:

**Docker:**
```dockerfile
COPY templates/ /app/templates/
```

**Manual deployment:**
```bash
# Copy templates folder along with dist/
cp -r templates/ /production/path/
```

### Important Notes

- Template is read at runtime, not bundled during build
- `process.cwd()` returns the directory where the Node.js process was started
- Always run the application from the project root directory
- If you add more templates, place them in the `templates/` folder

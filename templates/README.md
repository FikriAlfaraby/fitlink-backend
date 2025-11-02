# Templates Folder

This folder contains HTML templates used by the application.

## Invoice Template

**File:** `invoice-template.html`

Used by the Gym Invoice PDF generation service to create professional invoices.

### Template Variables

The following placeholders are replaced with actual data:

- `{{gymName}}` - Gym name
- `{{gymAddress}}` - Gym address
- `{{gymPhone}}` - Gym phone number
- `{{gymEmail}}` - Gym email
- `{{gymId}}` - Gym unique identifier
- `{{gymCode}}` - Gym code
- `{{invoicePeriod}}` - Invoice period (e.g., "October 2024")
- `{{generatedDate}}` - Date when invoice was generated
- `{{totalTransactions}}` - Total number of transactions
- `{{invoiceItems}}` - HTML table rows with transaction details
- `{{subtotal}}` - Subtotal amount
- `{{tax}}` - Tax amount
- `{{total}}` - Total amount

### Editing

You can edit the HTML template directly. Changes will take effect immediately without needing to rebuild the application.

### Styling

The template includes inline CSS for:
- Professional gradient header
- Responsive table layout
- Print-optimized formatting
- Modern color scheme

Feel free to customize the styles to match your branding.

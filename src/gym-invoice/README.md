# Gym Invoice PDF Generator

This module generates professional PDF invoices for gym transactions based on a specified month and year.

## Features

- ✅ Generate PDF invoices with HTML template
- ✅ Automatic month/year detection (defaults to current month)
- ✅ Beautiful, professional invoice design
- ✅ Includes gym details, transaction history, and totals
- ✅ Currency formatting (IDR)
- ✅ Downloadable PDF file

## API Endpoint

### Generate Gym Invoice PDF

**GET** `/gym-invoice/:gymId/pdf`

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `gymId` | string (path) | Yes | The unique identifier of the gym |
| `month` | string (query) | No | Month number (1-12). Defaults to current month |
| `year` | string (query) | No | Year (e.g., 2024). Defaults to current year |

#### Example Requests

```bash
# Generate invoice for current month
GET /gym-invoice/abc123-gym-id/pdf

# Generate invoice for specific month and year
GET /gym-invoice/abc123-gym-id/pdf?month=10&year=2024

# Generate invoice for specific month (current year)
GET /gym-invoice/abc123-gym-id/pdf?month=9
```

#### Response

- **Success (200)**: Returns a PDF file with appropriate headers
  - Content-Type: `application/pdf`
  - Content-Disposition: `attachment; filename="gym-invoice-{gymId}-{year}-{month}.pdf"`
  
- **Error (500)**: Returns JSON error response
  ```json
  {
    "statusCode": 500,
    "message": "Error message",
    "error": "Internal Server Error"
  }
  ```

## Invoice Template

The invoice includes:

1. **Header Section**
   - Gym name, address, phone, email
   - Invoice title and period

2. **Details Section**
   - Invoice period
   - Generated date
   - Total transactions
   - Gym ID and code
   - Active members count

3. **Transaction History Table**
   - Date
   - Transaction ID
   - Member name
   - Description
   - Amount

4. **Active Members List**
   - Member number
   - Name
   - Email
   - Phone
   - Membership type
   - Join date
   - Expiry date

5. **Summary Section**
   - Subtotal
   - Tax (0%)
   - Total amount

6. **Footer**
   - Thank you message
   - Contact information

## Technical Details

### Dependencies

- **html-pdf-node**: For PDF generation from HTML (better WSL/Docker compatibility than puppeteer)
- **@prisma/client**: Database access

### Template Location

`templates/invoice-template.html` (in project root folder)

### Currency Format

All amounts are formatted in Indonesian Rupiah (IDR) with no decimal places.

### PDF Settings

- Format: A4
- Margins: 20px (all sides)
- Print background: Enabled
- Orientation: Portrait

## Development

To modify the invoice template:

1. Edit `templates/invoice-template.html`
2. Use placeholders in double curly braces: `{{placeholderName}}`
3. Available placeholders:
   - `{{gymName}}`
   - `{{gymAddress}}`
   - `{{gymPhone}}`
   - `{{gymEmail}}`
   - `{{gymId}}`
   - `{{gymCode}}`
   - `{{invoicePeriod}}`
   - `{{generatedDate}}`
   - `{{totalTransactions}}`
   - `{{invoiceItems}}` (HTML table rows)
   - `{{subtotal}}`
   - `{{tax}}`
   - `{{total}}`

## Error Handling

The service handles the following error cases:

- Gym not found
- Invalid month/year parameters
- Database connection issues
- PDF generation failures

All errors are caught and returned with appropriate HTTP status codes and messages.

# Gym Invoice PDF - Usage Examples

## Quick Start

### 1. Generate Invoice for Current Month

```bash
curl -X GET "http://localhost:3000/gym-invoice/{your-gym-id}/pdf" \
  --output invoice.pdf
```

This will generate a PDF invoice for the current month and year.

### 2. Generate Invoice for Specific Month

```bash
# For October 2024
curl -X GET "http://localhost:3000/gym-invoice/{your-gym-id}/pdf?month=10&year=2024" \
  --output invoice-oct-2024.pdf
```

### 3. Generate Invoice for Specific Month (Current Year)

```bash
# For September of current year
curl -X GET "http://localhost:3000/gym-invoice/{your-gym-id}/pdf?month=9" \
  --output invoice-sep.pdf
```

## Frontend Integration Examples

### React/Next.js

```typescript
async function downloadGymInvoice(gymId: string, month?: number, year?: number) {
  try {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    
    const url = `/gym-invoice/${gymId}/pdf${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to generate invoice');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `gym-invoice-${gymId}-${year || new Date().getFullYear()}-${month || new Date().getMonth() + 1}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log('Invoice downloaded successfully');
  } catch (error) {
    console.error('Error downloading invoice:', error);
  }
}

// Usage
downloadGymInvoice('abc123-gym-id', 10, 2024);
```

### React Component Example

```tsx
import { useState } from 'react';

export function InvoiceDownloader({ gymId }: { gymId: string }) {
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const handleDownload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: month.toString(),
        year: year.toString()
      });
      
      const response = await fetch(`/gym-invoice/${gymId}/pdf?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gym-invoice-${gymId}-${year}-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      alert('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to download invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <select 
          value={month} 
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border rounded px-3 py-2"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        
        <select 
          value={year} 
          onChange={(e) => setYear(Number(e.target.value))}
          className="border rounded px-3 py-2"
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      
      <button
        onClick={handleDownload}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Download Invoice'}
      </button>
    </div>
  );
}
```

### Angular

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  constructor(private http: HttpClient) {}

  downloadGymInvoice(gymId: string, month?: number, year?: number) {
    let params = {};
    if (month) params['month'] = month.toString();
    if (year) params['year'] = year.toString();

    this.http.get(`/gym-invoice/${gymId}/pdf`, {
      params,
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gym-invoice-${gymId}-${year || new Date().getFullYear()}-${month || new Date().getMonth() + 1}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading invoice:', error);
      }
    });
  }
}
```

## Testing with Postman

1. **Create a new GET request**
   - URL: `http://localhost:3000/gym-invoice/{gymId}/pdf`
   
2. **Add query parameters** (optional)
   - Key: `month`, Value: `10`
   - Key: `year`, Value: `2024`

3. **Send the request**

4. **Save the response**
   - Click "Save Response" > "Save to a file"
   - Choose location and save as `.pdf`

## Response Headers

When successful, the API returns these headers:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="gym-invoice-{gymId}-{year}-{month}.pdf"
Content-Length: {size in bytes}
```

## Error Responses

### Gym Not Found
```json
{
  "statusCode": 500,
  "message": "Gym not found",
  "error": "Internal Server Error"
}
```

### Invalid Parameters
The API will use defaults for invalid or missing parameters:
- Missing month → Current month
- Missing year → Current year

## Notes

- Month parameter should be between 1-12
- Year should be a valid 4-digit year
- The PDF is generated on-the-fly, so response time may vary (typically 2-5 seconds)
- Large transaction histories may take longer to generate

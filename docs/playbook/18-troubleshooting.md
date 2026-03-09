# Chapter 18: Troubleshooting

## Common Issues

### Document Upload Fails
- **Cause**: File too large (>50MB) or unsupported format
- **Fix**: Reduce file size or convert to supported format (CSV, XLSX, TXT)

### PII Scan False Positive
- **Cause**: Numeric patterns matching PII regex
- **Fix**: Analyst can review and acknowledge; sanitization removes flagged columns

### Job Stuck in Processing
- **Cause**: Worker crash or long-running computation
- **Fix**: Heartbeat timeout releases lock; job retries automatically up to maxAttempts

### Phase Locked
- **Cause**: Prerequisite phase gate not passed
- **Fix**: Complete the prerequisite phase and pass its gate checklist

### Fact Extraction Returns Few Results
- **Cause**: Document not well-structured or mostly text
- **Fix**: Ensure CSV/XLSX data has clear headers; for text docs, review classification

### Login Issues
- **Cause**: Session expired or server restart (in-memory sessions)
- **Fix**: Re-login; in production, sessions persist via pg-session store

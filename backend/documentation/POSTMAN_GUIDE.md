# Postman API Testing Guide

Complete step-by-step guide to import, configure, and run the Championships API tests in Postman.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Importing the Collection](#importing-the-collection)
4. [Running Individual Requests](#running-individual-requests)
5. [Running the Full Collection](#running-the-full-collection)
6. [Understanding the Tests](#understanding-the-tests)
7. [Tips & Best Practices](#tips--best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- **Postman Desktop Application** installed (free version available at [postman.com](https://www.postman.com/downloads/))
- **Championships API Server** running on `http://localhost:3000`
- **Database seeded** with test data (run `npm run seed` in the project)

### Starting the API Server

If the server is not already running, execute in your project terminal:

```bash
npm run start:dev
```

Expected output:
```
[Nest] XXXX - 20/01/2026, XX:XX:XX     LOG [NestApplication] Nest application successfully started
✅ API running on http://localhost:3000
```

### Verifying Database is Seeded

```bash
npm run seed
```

You should see:
```
--- Starting Database Cleanup ---
--- Seeding Countries with Flag URLs ---
--- Seeding Sports with Official Rules (MVP: 6 Collective Sports) ---
--- Seeding Cities ---
--- Seeding Stadiums/Gymnasiums ---
--- Seeding Clubs ---
--- Seeding Leagues with MVP Configuration ---
--- Seeding Process Completed Successfully ---
```

---

## Installation

### Option 1: Download Postman Desktop App (Recommended)

1. Go to [postman.com/downloads](https://www.postman.com/downloads/)
2. Download the installer for Windows
3. Run the installer and follow on-screen instructions
4. Launch Postman application

### Option 2: Use Web Version

1. Go to [web.postman.co](https://web.postman.co)
2. Sign in or create a free account
3. Proceed to importing the collection

---

## Importing the Collection

### Step 1: Open Postman

Launch the Postman application and you'll see the main interface.

### Step 2: Access Import Dialog

- **Option A**: Click the "Import" button in the top-left corner
- **Option B**: Use keyboard shortcut `Ctrl+O` (Windows) or `Cmd+O` (Mac)
- **Option C**: Go to File menu → Import

### Step 3: Locate and Select the Collection File

1. Click "File" in the import dialog (if not already selected)
2. Click "Choose Files"
3. Navigate to your project root directory:
   ```
   C:\Users\milen\Documents\Personal\Championships\backend\
   ```
4. Find and select: `Championships_API.postman_collection.json`
5. Click "Open"

### Step 4: Import Settings

A preview dialog will show the collection contents. You'll see:
- **Collection name**: Championships API
- **Number of items**: 38 endpoints organized in 13 folders
- **Variables**: baseUrl variable

Click the blue "Import" button to proceed.

### Step 5: Verify Import Success

Once imported, you should see:
- A new collection named "Championships API" in the left sidebar under "Collections"
- Expandable folders for each resource type (Countries, Sports, Cities, etc.)
- A green checkmark confirming successful import

---

## Running Individual Requests

### Step 1: Expand a Resource Folder

In the left sidebar under "Collections":

1. Click on "Championships API" collection
2. Expand any folder (e.g., "Countries")
3. You'll see all requests for that resource

### Step 2: Select a Request

Click on any request, for example:
- "Get All Countries"
- "Create Country"
- "Update Country"
- etc.

The request details will load in the main panel.

### Step 3: Review Request Details

The main panel shows:
- **HTTP Method** (GET, POST, PUT, DELETE)
- **URL** field showing the endpoint (uses `{{baseUrl}}` variable)
- **Headers** tab (Content-Type, Authorization, etc.)
- **Body** tab (for POST/PUT requests with JSON payloads)
- **Params** tab (for query parameters)

### Step 4: Execute the Request

Click the blue "Send" button or press `Ctrl+Enter`

### Step 5: View Response

Below the request, the response panel shows:
- **Status Code** (200, 201, 404, etc.) with color indicator
- **Response Time** (e.g., "45ms")
- **Response Body** in formatted JSON
- **Headers** tab showing response headers
- **Cookies** tab (if applicable)

### Example: Get All Countries

```
Request:
  Method: GET
  URL: http://localhost:3000/countries

Expected Response (Status 200):
  [
    {
      "id": 77,
      "name": "Brazil",
      "continent": "South America",
      "code": "BRA",
      "flagUrl": "https://flagcdn.com/br.svg",
      "createdAt": "2026-01-20T15:41:35.038Z"
    },
    ...
  ]
```

---

## Running the Full Collection

### Method 1: Collection Runner (Recommended)

1. **Click the "Run" button** on the collection card in the left sidebar
   - Or select collection and click "Run" in the top menu

2. **Configuration screen opens**:
   - **Collection**: Championships API (should be selected)
   - **Environment**: Leave as "No Environment" or create one
   - **Data**: Leave empty (unless batch testing)
   - **Delay**: Set to 100-500ms between requests (prevents overwhelming the server)

3. **Click "Run Championships API"** to start

4. **Results display in real-time**:
   - Green checkmark ✅ for successful requests
   - Red X ❌ for failed requests
   - Pass/Fail count at bottom

### Method 2: Manual Sequential Testing

1. Go through each folder systematically:
   - Countries (6 requests)
   - Sports (6 requests)
   - Cities (5 requests)
   - etc.

2. Run requests in order:
   - Start with GET requests (read operations)
   - Then POST (create)
   - Then PUT (update)
   - Finally DELETE (delete)

3. Note any failures and check the response for error details

---

## Understanding the Tests

### Collection Structure

```
Championships API (Root Collection)
├── Countries (Folder)
│   ├── Get All Countries
│   ├── Get Country by ID
│   ├── Get Countries by Continent
│   ├── Create Country
│   ├── Update Country
│   └── Delete Country
├── Sports (Folder)
│   ├── Get All Sports
│   ├── Get Sport by ID
│   ├── Get Sports by Type
│   ├── Create Sport
│   ├── Update Sport
│   └── Delete Sport
├── Cities (Folder)
│   ├── Get All Cities
│   ├── Get City by ID
│   ├── Create City
│   ├── Update City
│   └── Delete City
├── Clubs (Folder)
│   └── [5 requests]
├── Stadiums (Folder)
│   └── [5 requests]
├── Leagues (Folder)
│   ├── [5 standard CRUD requests]
│   ├── Add League Link
│   └── Remove League Link
├── Phases (Folder)
│   └── [5 requests]
├── Groups (Folder)
│   └── [5 requests]
├── Matches (Folder)
│   └── [6 requests including Update Match Score]
├── Standings (Folder)
│   └── [5 requests]
├── Match Divisions (Folder)
│   └── [5 requests]
├── Match Events (Folder)
│   └── [5 requests]
├── Seasons & Season Clubs (Folder)
│   └── Get Season Clubs
└── Error Handling Tests (Folder)
    ├── Get Non-existent Country (404)
    └── Create Country with Missing Fields (400)
```

### Request Types

#### 1. GET Requests (Read Operations)
- **Purpose**: Retrieve data from the server
- **Status Code**: 200 (OK)
- **Body**: None
- **Example**: `GET /countries`

#### 2. POST Requests (Create Operations)
- **Purpose**: Create new resources
- **Status Code**: 201 (Created) or 200 (OK)
- **Body**: JSON with required fields
- **Example**: `POST /countries` with body:
  ```json
  {
    "name": "Switzerland",
    "continent": "Europe",
    "code": "SUI",
    "flagUrl": "https://flagcdn.com/ch.svg"
  }
  ```

#### 3. PUT Requests (Update Operations)
- **Purpose**: Modify existing resources
- **Status Code**: 200 (OK)
- **Body**: JSON with updated fields
- **URL Parameter**: ID of resource to update
- **Example**: `PUT /countries/77` with updated data

#### 4. DELETE Requests (Delete Operations)
- **Purpose**: Remove resources
- **Status Code**: 200 (OK) or 204 (No Content)
- **Body**: None
- **URL Parameter**: ID of resource to delete
- **Example**: `DELETE /countries/77`

### Response Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK - Request succeeded | GET /countries returns data |
| 201 | Created - Resource created | POST /countries returns new resource |
| 204 | No Content - Successful with no body | DELETE /countries/77 |
| 400 | Bad Request - Invalid data | POST /countries with missing fields |
| 404 | Not Found - Resource doesn't exist | GET /countries/99999 |
| 500 | Server Error - Unexpected error | Database connection failure |

---

## Tips & Best Practices

### 1. Check the Base URL Variable

Before running any requests:

1. Click on the "Championships API" collection name
2. Go to the **Variables** tab
3. Verify `baseUrl` is set to `http://localhost:3000`
4. If running on a different server, update the value

### 2. Create a Custom Environment (Optional)

For better organization, create separate environments for different scenarios:

1. Click "Environments" in the left sidebar
2. Click "Create Environment"
3. Name it (e.g., "Local Dev", "Staging")
4. Add variables:
   - `baseUrl`: `http://localhost:3000`
   - `apiKey`: (if authentication is added later)
5. Click "Save"
6. Select the environment from the dropdown in the top-right

### 3. Use Request Descriptions

Each request includes a description explaining its purpose. Hover over or expand to see:
- What the endpoint does
- What parameters it expects
- What response format to expect

### 4. Save Response Data

After running a successful request:

1. Click the response
2. Click the "Save Response" icon (floppy disk)
3. Name the saved example
4. Use for reference in the future

### 5. Test Ordering Matters

For dependent endpoints, follow this order:

1. **GET** requests first (verify data exists)
2. **POST** requests (create new resources)
3. **PUT** requests (update what was created)
4. **DELETE** requests (clean up test data)

### 6. Monitor Network Tab

For performance testing:

1. Open Postman DevTools: `Ctrl+Alt+I`
2. Go to "Network" tab
3. Run requests and observe:
   - Response time
   - Size of payload
   - Network latency

### 7. Use Pre-request Scripts

For advanced testing, add pre-request scripts:

1. Select a request
2. Go to "Pre-request Script" tab
3. Add JavaScript to set variables or timestamp data
4. Example:
   ```javascript
   pm.environment.set("timestamp", new Date().toISOString());
   ```

### 8. Add Tests

To add test assertions:

1. Select a request
2. Go to "Tests" tab
3. Add JavaScript assertions
4. Example:
   ```javascript
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });
   ```

---

## Troubleshooting

### Issue 1: "Could not get response" Error

**Causes**:
- API server is not running
- Server is running on a different port
- Network connectivity issue

**Solutions**:
1. Verify server is running: `npm run start:dev`
2. Check server output shows: `✅ API running on http://localhost:3000`
3. Test with browser: open `http://localhost:3000/countries`
4. Verify baseUrl variable in Postman is correct

### Issue 2: "Cannot POST /countries" 405 Error

**Causes**:
- Endpoint doesn't support POST method
- URL path is incorrect
- Typo in endpoint name

**Solutions**:
1. Double-check request method (GET, POST, PUT, DELETE)
2. Verify URL matches documentation
3. Check that URL doesn't have trailing slashes or extra characters
4. Review API documentation in [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)

### Issue 3: 400 Bad Request Error

**Causes**:
- Missing required fields in request body
- Invalid data type (e.g., string instead of number)
- JSON formatting error

**Solutions**:
1. Check response body for detailed error message
2. Review required fields in request body
3. Validate JSON syntax (use online JSON validator)
4. Compare with working example in collection
5. Check data types match schema

### Issue 4: 404 Not Found Error

**Causes**:
- Resource ID doesn't exist
- Resource was deleted
- Using wrong ID from different environment

**Solutions**:
1. First run "Get All [Resource]" to see available IDs
2. Use IDs from the response
3. Verify the ID belongs to the resource you're trying to access
4. Check if resource was accidentally deleted in a previous test

### Issue 5: Empty Responses

**Causes**:
- Database table is empty
- Seed script hasn't been run
- Query filtered out all results

**Solutions**:
1. Run database seed: `npm run seed`
2. Verify seed completed successfully
3. Check query parameters aren't too restrictive
4. Try "Get All [Resource]" without filters

### Issue 6: Authentication Errors (When Implemented)

**Expected in future phases** when authentication is added.

**Solutions**:
1. Add authorization token to Postman
2. Go to request → Authorization tab
3. Select type: Bearer Token
4. Paste your API token
5. Or set as environment variable for reuse

---

## Quick Reference: Request Examples

### Get All Data

```
Method: GET
URL: {{baseUrl}}/countries
Status: 200
Response: Array of objects
```

### Get Single Record

```
Method: GET
URL: {{baseUrl}}/countries/77
Status: 200
Response: Single object or 404 if not found
```

### Create New Record

```
Method: POST
URL: {{baseUrl}}/countries
Headers: Content-Type: application/json
Body: {
  "name": "France",
  "continent": "Europe",
  "code": "FRA",
  "flagUrl": "https://flagcdn.com/fr.svg"
}
Status: 201 or 200
Response: Created object with ID
```

### Update Record

```
Method: PUT
URL: {{baseUrl}}/countries/77
Headers: Content-Type: application/json
Body: {
  "name": "Brazil Updated",
  "continent": "South America",
  "code": "BRA",
  "flagUrl": "https://flagcdn.com/br.svg"
}
Status: 200
Response: Updated object
```

### Delete Record

```
Method: DELETE
URL: {{baseUrl}}/countries/77
Status: 200 or 204
Response: Empty or success message
```

### Filter by Query Parameter

```
Method: GET
URL: {{baseUrl}}/countries?continent=Europe
Status: 200
Response: Array of countries in Europe only
```

---

## Next Steps After Testing

1. **Document Results**: Screenshot or export test results for records
2. **Identify Issues**: Note any failed requests and review API logs
3. **Refine Data**: Adjust test data as needed based on business requirements
4. **Automate Tests**: Use Collection Runner for CI/CD integration
5. **Performance Testing**: Monitor response times for optimization opportunities

---

## Additional Resources

- **Postman Documentation**: https://learning.postman.com/docs/
- **REST API Concepts**: https://www.postman.com/resources/infographics/rest-api/
- **API Testing Best Practices**: https://www.postman.com/resources/infographics/testing-api/
- **Your API Documentation**: See [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)

---

## Getting Help

If you encounter issues:

1. **Check API Server Logs**: Look at terminal output when running `npm run start:dev`
2. **Review Response Details**: Postman response body usually contains error message
3. **Validate Request**: Ensure URL, method, and body are correct
4. **Restart Server**: Sometimes helps clear cached state
5. **Clear Database**: Run `npm run seed` to reset to fresh state

---

**Last Updated**: January 20, 2026
**API Version**: 1.0.0
**Total Endpoints Tested**: 38

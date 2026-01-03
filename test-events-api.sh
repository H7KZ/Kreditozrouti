#!/bin/bash

# Test script for Event API endpoints
# Make sure the API server is running before executing this script

API_BASE="http://localhost:40080"

echo "🧪 Testing Event API Endpoints"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Note: These tests require authentication. Make sure you're logged in.${NC}"
echo "If you need to get a session cookie, log in through the frontend first."
echo ""

# Test 1: Get all events (no filter)
echo "Test 1: GET /events (no filter)"
echo "--------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "${API_BASE}/events" \
  -H "Content-Type: application/json" \
  --cookie-jar /tmp/cookies.txt \
  --cookie /tmp/cookies.txt)

HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ Success${NC}"
    echo "Response: $BODY" | head -c 200
    echo "..."
else
    echo -e "${RED}✗ Failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $BODY"
fi
echo ""
echo ""

# Test 2: Get events with date range
echo "Test 2: GET /events?startDate=...&endDate=..."
echo "----------------------------------------------"
START_DATE="2026-01-01T00:00:00Z"
END_DATE="2026-01-31T23:59:59Z"

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
  "${API_BASE}/events?startDate=${START_DATE}&endDate=${END_DATE}" \
  -H "Content-Type: application/json" \
  --cookie /tmp/cookies.txt)

HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ Success${NC}"
    EVENT_COUNT=$(echo "$BODY" | grep -o '"id"' | wc -l)
    echo "Found $EVENT_COUNT events in January 2026"
    echo "Response: $BODY" | head -c 200
    echo "..."
else
    echo -e "${RED}✗ Failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $BODY"
fi
echo ""
echo ""

# Test 3: Create a new event
echo "Test 3: POST /events (create new event)"
echo "----------------------------------------"
NEW_EVENT='{
  "title": "Test Event from Script",
  "subtitle": "Automated Test",
  "datetime": "2026-01-15T14:00:00Z",
  "description": "This is a test event created by the test script",
  "place": "Test Location",
  "author": "Test Script",
  "language": "en"
}'

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${API_BASE}/events" \
  -H "Content-Type: application/json" \
  --cookie /tmp/cookies.txt \
  -d "$NEW_EVENT")

HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 201 ]; then
    echo -e "${GREEN}✓ Success${NC}"
    EVENT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Created event with ID: $EVENT_ID"
    echo "Response: $BODY"

    # Save ID for later tests
    echo "$EVENT_ID" > /tmp/test_event_id.txt
else
    echo -e "${RED}✗ Failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $BODY"
fi
echo ""
echo ""

# Test 4: Update the created event (if Test 3 succeeded)
if [ -f /tmp/test_event_id.txt ]; then
    EVENT_ID=$(cat /tmp/test_event_id.txt)

    echo "Test 4: PUT /events/:id (update event)"
    echo "---------------------------------------"
    UPDATE_DATA='{
      "title": "Updated Test Event",
      "place": "Updated Location"
    }'

    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X PUT \
      "${API_BASE}/events/${EVENT_ID}" \
      -H "Content-Type: application/json" \
      --cookie /tmp/cookies.txt \
      -d "$UPDATE_DATA")

    HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Failed (HTTP $HTTP_STATUS)${NC}"
        echo "Response: $BODY"
    fi
    echo ""
    echo ""

    # Test 5: Get the specific event
    echo "Test 5: GET /events/:id (get specific event)"
    echo "---------------------------------------------"
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET \
      "${API_BASE}/events/${EVENT_ID}" \
      -H "Content-Type: application/json" \
      --cookie /tmp/cookies.txt)

    HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Failed (HTTP $HTTP_STATUS)${NC}"
        echo "Response: $BODY"
    fi
    echo ""
    echo ""

    # Test 6: Delete the created event
    echo "Test 6: DELETE /events/:id (delete event)"
    echo "------------------------------------------"
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE \
      "${API_BASE}/events/${EVENT_ID}" \
      -H "Content-Type: application/json" \
      --cookie /tmp/cookies.txt)

    HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)

    if [ "$HTTP_STATUS" -eq 204 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        echo "Event deleted successfully"
    else
        echo -e "${RED}✗ Failed (HTTP $HTTP_STATUS)${NC}"
        echo "Response: $(echo "$RESPONSE" | sed '/HTTP_STATUS/d')"
    fi
    echo ""

    # Cleanup
    rm -f /tmp/test_event_id.txt
fi

echo ""
echo "================================"
echo "🏁 Tests Complete"
echo ""
echo -e "${YELLOW}Note: If you see 401 errors, you need to authenticate first.${NC}"
echo "Log in through the frontend at http://localhost:45173 to get a session."


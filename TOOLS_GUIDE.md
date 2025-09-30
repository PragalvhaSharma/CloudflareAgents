# AI Agent Tools Guide

This document describes all available tools in the AI Chat Agent and how to use them.

## Available Tools

### 1. **getLocalTime** (Auto-executes)

- **Description**: Gets the current local time for any specified location
- **Type**: Auto-executes (no confirmation needed)
- **Input**: `location` (string) - City name, country, or timezone
- **How it works**:
  - Uses WorldTimeAPI to fetch real-time data
  - Supports major cities worldwide
  - Falls back to UTC if location not found
- **Example prompts**:
  - "What time is it in New York?"
  - "Local time in Tokyo"
  - "Tell me the time in London"
  - "What's the current time in Sydney?"

### 2. **getWeatherInformation** (Requires confirmation)

- **Description**: Shows weather conditions for a given city
- **Type**: Requires human confirmation before execution
- **Input**: `city` (string) - Name of the city
- **How it works**:
  - Uses Open-Meteo API (free, no API key needed)
  - Provides temperature, humidity, wind speed, conditions
  - Geocodes city name to coordinates first
- **Example prompts**:
  - "What's the weather in San Francisco?"
  - "Show me the weather for Paris"
  - "How's the weather in Tokyo?"
  - "Tell me about the weather in London"

### 3. **scheduleTask** (Auto-executes)

- **Description**: Schedules a task to be executed at a later time
- **Type**: Auto-executes (no confirmation needed)
- **Input**:
  - `when` - Can be a delay (seconds), a date, or a cron expression
  - `description` - Description of the task
- **How it works**: Uses the Agent's built-in scheduling API
- **Example prompts**:
  - "Remind me in 5 minutes to check email"
  - "Schedule a task for tomorrow at 3pm"
  - "Set a reminder for next Monday"

### 4. **getScheduledTasks** (Auto-executes)

- **Description**: Lists all currently scheduled tasks
- **Type**: Auto-executes (no confirmation needed)
- **Input**: None
- **Example prompts**:
  - "Show me my scheduled tasks"
  - "List all reminders"
  - "What tasks do I have scheduled?"

### 5. **cancelScheduledTask** (Auto-executes)

- **Description**: Cancels a scheduled task by its ID
- **Type**: Auto-executes (no confirmation needed)
- **Input**: `taskId` (string) - The ID of the task to cancel
- **Example prompts**:
  - "Cancel task [task-id]"
  - "Remove the scheduled task with ID [task-id]"

## Tool Execution Types

### Auto-Execute Tools

These tools run immediately without requiring user confirmation:

- `getLocalTime`
- `scheduleTask`
- `getScheduledTasks`
- `cancelScheduledTask`

### Confirmation-Required Tools

These tools require user approval before execution:

- `getWeatherInformation`

When a confirmation-required tool is called, the UI will display a confirmation dialog where you can:

- **Approve**: Execute the tool with the given parameters
- **Deny**: Cancel the tool execution

## Testing the Tools

### Testing getLocalTime

```
User: What time is it in New York?
Expected: Real current time in New York with timezone info

User: Tell me the time in London and Tokyo
Expected: Real current times for both cities
```

### Testing getWeatherInformation

```
User: What's the weather like in San Francisco?
Expected: Confirmation prompt → Approve → Real weather data

User: Show me the weather in Paris
Expected: Temperature, conditions, humidity, wind speed
```

### Testing scheduleTask

```
User: Remind me in 10 seconds to check my email
Expected: Task scheduled confirmation with task ID

User: Schedule a task for 2pm tomorrow to call John
Expected: Task scheduled for specific date/time
```

### Testing getScheduledTasks

```
User: Show me all my scheduled tasks
Expected: List of all scheduled tasks with IDs and times
```

### Testing cancelScheduledTask

```
User: Cancel task [insert-task-id-here]
Expected: Confirmation that task was cancelled
```

## API Details

### WorldTimeAPI (getLocalTime)

- **Endpoint**: https://worldtimeapi.org/api/timezone
- **Free**: Yes, no API key required
- **Rate Limits**: Reasonable for development use

### Open-Meteo API (getWeatherInformation)

- **Endpoint**: https://api.open-meteo.com/v1/forecast
- **Free**: Yes, no API key required
- **Rate Limits**: Generous for non-commercial use
- **Features**: Current weather, forecasts, multiple parameters

## Common Issues & Solutions

### Issue: "Unable to determine exact timezone"

**Solution**: Try using a more specific city name or a major city nearby

### Issue: "Unable to find location" (weather)

**Solution**: Use the full city name or try a nearby major city

### Issue: Tool not executing

**Solution**:

1. Check browser console for errors
2. Ensure the agent is connected (check status indicator)
3. Try reloading the page

### Issue: Confirmation dialog not appearing

**Solution**: Check that the tool is listed in `toolsRequiringConfirmation` in `app.tsx`

## Adding New Tools

To add a new tool:

1. **Define the tool** in `src/tools.ts`:

```typescript
const myNewTool = tool({
  description: "Description of what the tool does",
  inputSchema: z.object({
    param: z.string().describe("Parameter description")
  }),
  execute: async ({ param }) => {
    // Implementation for auto-execute tools
    return "result";
  }
});
```

2. **Export the tool**:

```typescript
export const tools = {
  // ... existing tools
  myNewTool
} satisfies ToolSet;
```

3. **For confirmation-required tools**, omit the `execute` function and add to `executions`:

```typescript
const myConfirmTool = tool({
  description: "Tool requiring confirmation",
  inputSchema: z.object({ param: z.string() })
  // No execute function
});

export const executions = {
  // ... existing executions
  myConfirmTool: async ({ param }: { param: string }) => {
    // Implementation here
    return "result";
  }
};
```

4. **Update the UI** if the tool requires confirmation:
   Add the tool name to `toolsRequiringConfirmation` in `src/app.tsx`:

```typescript
const toolsRequiringConfirmation: (keyof typeof tools)[] = [
  "getWeatherInformation",
  "myConfirmTool" // Add your new tool here
];
```

## Troubleshooting

### Enable Debug Mode

1. Click the bug icon (🐛) in the top navigation bar
2. This will show the raw message objects in the UI
3. Check browser console for detailed logs

### Check Tool State

Tools go through these states:

- `input-streaming`: Tool is being called
- `input-available`: Waiting for user confirmation (confirmation-required tools only)
- `output-available`: Tool has executed and returned a result

### Common Errors

- **Network errors**: Check your internet connection
- **API errors**: The external APIs might be temporarily down
- **Parsing errors**: Check that input parameters match the expected schema

## Performance Notes

- Tool calls are debounced to prevent excessive API requests
- Results are not cached (each request fetches fresh data)
- Network timeouts are handled gracefully with fallback messages
- The AI may skip tools if it can answer directly from its knowledge

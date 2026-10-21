# USB Debugging Guide for Rubber Intelligence App

This guide explains how to run the Rubber Intelligence App on a physical Android device using USB Debugging while connecting to a local backend API.

## Prerequisites

1.  **Android Phone**: 
    - Enable **Developer Options** (Go to Settings > About Phone > Tap "Build Number" 7 times).
    - Enable **USB Debugging** in Developer Options.
2.  **USB Cable**: Connect your phone to your computer.
3.  **ADB (Android Debug Bridge)**:
    - Included with Android Studio or "SDK Platform-Tools".
    - Verify installation by running `adb version` in your terminal.

## Configuration Steps

### 1. Configure the Environment API URL

The app needs to know where to send API requests. When using USB debugging with `adb reverse`, we can point the app to `localhost` exactly like we do on the computer.

1.  Navigate to the `rubber-intelligence-app` directory.
2.  Create or edit the `.env` file at the root of the project.
3.  Add the following line:

```properties
EXPO_PUBLIC_API_URL=http://localhost:5001/api
```

### 2. Port Forwarding (The Magic Step)

By default, `localhost` on your phone refers to the phone itself, not your computer. We use `adb reverse` to map a port on the phone to the same port on your computer.

1.  Connect your phone via USB.
2.  Open a terminal.
3.  Run the following command:

```bash
adb reverse tcp:5001 tcp:5001
```

*This tells the phone: "Send any traffic from port 5001 on the phone to port 5001 on the connected computer."*

**Note**: You must run this command **every time** you disconnect and reconnect the USB cable or restart the computer.

## Running the App

1.  **Start the Backend**:
    - Ensure your .NET Web API is running and listening on port `5001`.

2.  **Start the Frontend**:
    - Run the following command in the `rubber-intelligence-app` folder:
    
    ```bash
    npx expo start --clear
    ```
    *(The `--clear` flag ensures the cached configuration is refreshed).*

3.  **Launch on Device**:
    - Press `a` in the terminal to open on Android, or scan the QR code using the Expo Go app.

## Troubleshooting

### MongoDB Connection Issues (Backend)

If you see errors like **`SocketException: No such host is known`** or **`Failed to connect to MongoDB`** in your backend terminal:

**1. Flush DNS Cache**
This is the most common fix if your computer suddenly cannot resolve the MongoDB address.
1.  Open a **Administrator** Terminal (PowerShell or CMD).
2.  Run:
    ```bash
    ipconfig /flushdns
    ```
3.  Restart your backend (`dotnet run`).

**2. Check Firewall**
Ensure your firewall isn't blocking outbound traffic on port `27017`.
- **Test**: Run `Test-NetConnection -ComputerName 89.192.9.221 -Port 27017` in PowerShell. If `TcpTestSucceeded` is `True`, your network is fine.

**3. Dependency Injection Error**
If you see **`No service for type 'MongoDB.Driver.IMongoClient' has been registered`**:
-   You need to register the service in `Program.cs`.
-   Add this line before `builder.Build()`:
    ```csharp
    builder.Services.AddSingleton<IMongoClient>(sp =>
    {
        var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<MongoDbSettings>>().Value;
        return new MongoClient(settings.ConnectionString);
    });
    ```

### App Connection Issues (Frontend)

-   **"Network Error" or Connection Refused**:
    -   Check if `adb reverse` was successful. Run `adb reverse --list` to see active mappings.
    -   Run `adb reverse tcp:5001 tcp:5001` again.
    -   Ensure your backend is actually running on `http://localhost:5001`.

-   **Changes not reflecting**:
    -   Restart the Expo server with `npx expo start --clear`.

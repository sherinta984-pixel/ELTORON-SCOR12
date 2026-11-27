' Team B Player Minus
' Kabaddi Scoreboard Overlay - Design 2 (Turbo) only.
' The app must be running and the local Overlay Service must be started.

Try
    Dim vmixClient As New System.Net.WebClient()
    Dim response As String = vmixClient.DownloadString("http://127.0.0.1:3210/vmix?cmd=TEAM_B_MINUS")
    vmixClient.Dispose()
    Console.WriteLine("Team B Player Minus: " & response)
Catch ex As Exception
    Console.WriteLine("Team B Player Minus failed: " & ex.Message)
End Try

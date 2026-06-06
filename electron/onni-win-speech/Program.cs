using System.Text.Json;
using Windows.Globalization;
using Windows.Media.SpeechRecognition;

static class Program
{
    private static readonly string[] PreferredTags = ["es-CO", "es-MX", "es-ES", "es-US", "es"];

    static async Task<int> Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        var mode = args.Length > 0 ? args[0].Trim().ToLowerInvariant() : "once";
        return mode switch
        {
            "probe" => await RunProbeAsync(),
            "once" => await RunOnceAsync(),
            _ => await RunOnceAsync(),
        };
    }

    static async Task<int> RunProbeAsync()
    {
        try
        {
            var (recognizer, language) = await CreateRecognizerAsync();
            using (recognizer)
            {
                WriteJson(new { type = "available", language });
                return 0;
            }
        }
        catch (Exception ex)
        {
            WriteJson(new { type = "error", code = "not_available", message = ex.Message });
            return 1;
        }
    }

    static async Task<int> RunOnceAsync()
    {
        SpeechRecognizer? recognizer = null;
        try
        {
            var (created, language) = await CreateRecognizerAsync();
            recognizer = created;
            WriteJson(new { type = "start", language });

            var result = await recognizer.RecognizeAsync().AsTask().ConfigureAwait(false);
            switch (result.Status)
            {
                case SpeechRecognitionResultStatus.Success:
                {
                    var text = (result.Text ?? string.Empty).Trim();
                    if (!string.IsNullOrEmpty(text))
                    {
                        WriteJson(new { type = "result", text, isFinal = true });
                    }
                    else
                    {
                        WriteJson(new { type = "error", code = "no_match", message = (string?)null });
                    }
                    break;
                }
                case SpeechRecognitionResultStatus.UserCanceled:
                    WriteJson(new { type = "error", code = "client", message = (string?)null });
                    break;
                case SpeechRecognitionResultStatus.TimeoutExceeded:
                    WriteJson(new { type = "error", code = "speech_timeout", message = (string?)null });
                    break;
                default:
                    WriteJson(new { type = "error", code = "no_match", message = (string?)null });
                    break;
            }
        }
        catch (Exception ex)
        {
            WriteJson(new { type = "error", code = "start_failed", message = ex.Message });
        }
        finally
        {
            recognizer?.Dispose();
            WriteJson(new { type = "end" });
        }

        return 0;
    }

    static async Task<(SpeechRecognizer recognizer, string language)> CreateRecognizerAsync()
    {
        foreach (var tag in PreferredTags)
        {
            try
            {
                var recognizer = new SpeechRecognizer(new Language(tag));
                await PrepareRecognizerAsync(recognizer).ConfigureAwait(false);
                return (recognizer, tag);
            }
            catch
            {
                /* try next locale */
            }
        }

        var fallback = new SpeechRecognizer();
        await PrepareRecognizerAsync(fallback).ConfigureAwait(false);
        return (fallback, fallback.CurrentLanguage.LanguageTag);
    }

    static async Task PrepareRecognizerAsync(SpeechRecognizer recognizer)
    {
        recognizer.Constraints.Add(
            new SpeechRecognitionTopicConstraint(SpeechRecognitionScenario.Dictation, "OnniVers dictation"));
        var compiled = await recognizer.CompileConstraintsAsync().AsTask().ConfigureAwait(false);
        if (compiled.Status != SpeechRecognitionResultStatus.Success)
        {
            recognizer.Dispose();
            throw new InvalidOperationException("No se pudo preparar el reconocimiento de voz de Windows.");
        }
    }

    static void WriteJson(object payload)
    {
        Console.WriteLine(JsonSerializer.Serialize(payload));
    }
}

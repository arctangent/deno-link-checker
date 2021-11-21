using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Text.Json;
using System.Threading;

namespace LinkChecker.ConsoleApp
{
    public static class Helpers
    {

        public static void RandomSleep()
        {
            Random rnd = new();
            int sleepMilliseconds = rnd.Next(250, 500);
            Thread.Sleep(sleepMilliseconds);
        }

        public static void DebugPrint(object obj)
        {
            string jsonString = JsonSerializer.Serialize(obj);
            Console.WriteLine("\n\nDEBUG:\n\n{0}\n\n", jsonString);
        }

        public static HashSet<string> GetInternalHrefs(Uri baseUrl, string content)
        {
            HashSet<string> hrefs = RegexMatch(content);

            // Remove obvious problems
            hrefs.RemoveWhere(h => h.Length == 0);
            hrefs.RemoveWhere(h => h.StartsWith('#'));

            // Remove link to self
            hrefs.RemoveWhere(h => baseUrl.ToString().EndsWith(h));
            hrefs.RemoveWhere(h => baseUrl.ToString().EndsWith(h+'/'));

            // TODO: Need a better way to exclude non-http(s) schemes
            hrefs.RemoveWhere(h => h.StartsWith("tel:"));
            hrefs.RemoveWhere(h => h.StartsWith("email:"));

            // TODO: Need better way to exclude parts of a site
            hrefs.RemoveWhere(h => h.Contains("service-search"));

            string targetUrl = baseUrl.ToString();
            HashSet<string> results = new();

            foreach (string href in hrefs.ToList())
            {
                string newUrl = href;

                // Handle URLs beginning with a slash 
                if (newUrl.StartsWith('/'))
                {
                    newUrl = targetUrl + newUrl.TrimStart('/');
                }

                // Ignore anything external
                if (!newUrl.StartsWith(targetUrl))
                {
                    continue;
                }

                // Remove querystring and anchor links
                newUrl = newUrl.Split("?")[0];
                newUrl = newUrl.Split("#")[0];

                // Hopefully the URL is now OK
                results.Add(newUrl);

            }

            return results;
        }

        private static HashSet<string> RegexMatch(string inputString)
        {
            HashSet<string> hrefs = new();

            Match m;
            string HRefPattern = @"href\s*=\s*(?:[""'](?<1>[^""']*)[""']|(?<1>[^>\s]+))";
 
            m = Regex.Match(inputString, HRefPattern, RegexOptions.IgnoreCase | RegexOptions.Compiled);
            while (m.Success)
            {
                hrefs.Add(m.Groups[1].ToString().ToLower());
                m = m.NextMatch();
            }

            return hrefs;
        }
    }
}
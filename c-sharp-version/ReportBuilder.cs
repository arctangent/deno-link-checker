using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LinkChecker.ConsoleApp
{
    class ReportBuilder
    {
        private readonly IConfiguration config;
        private readonly ILogger<LinkChecker> logger;
        private readonly string rootUrl;

        public ReportBuilder(IConfiguration _config, ILogger<LinkChecker> _logger)
        {
            config = _config;
            logger = _logger;
            rootUrl = _config["root"];
        }


        public void Generate()
        {
            Console.WriteLine("Building report");

            using var context = new LinkCheckerContext(rootUrl);

            var addressesDict = context.Addresses.ToDictionary(x => x.Url);
            var redirectResolver = GenerateRedirectResolver(addressesDict);
            var summary = GenerateSummary(addressesDict, redirectResolver);

            // Export the list of Outputs to a CSV
            Console.WriteLine("REPORT");
            

            using (StreamWriter file = new("report.csv"))
            {
                file.WriteLine("Page,ProblemCode,ProblemDetail,FixCode,FixDetail");
                foreach (SummaryData item in summary)
                {
                    logger.LogTrace($"{item.Page},{item.ProblemCode},{item.ProblemDetail},{item.FixCode},{item.FixDetail}");
                    file.WriteLine($"{item.Page},{item.ProblemCode},{item.ProblemDetail},{item.FixCode},{item.FixDetail}");
                }
            }

            Console.WriteLine("Done");
        }

        private List<SummaryData> GenerateSummary(Dictionary<string, Address> addressesDict, Dictionary<string, string> redirectResolver)
        {
            List<SummaryData> summary = new();

            foreach (Address address in addressesDict.Values)
            {
                // Don't include pages without problems
                if (address.StatusCode == 200) continue;

                // Identify the problem and the fix

                string problemCode = "";
                string problemDetail = "";
                string fixCode = "";
                string fixDetail = "";

                // Redirect
                if (address.StatusCode.ToString().StartsWith('3'))
                {
                    problemCode = "Redirected URL";
                    problemDetail = address.Url;

                    if (redirectResolver.Keys.Contains(address.Url))
                    {
                        string eventualTarget = redirectResolver[address.Url];

                        if (eventualTarget == address.Url + '/')
                        {
                            // Trivial redirect
                            fixCode = "Add Slash";
                            fixDetail = address.Url + '/';
                        }
                        else
                        {
                            // Redirect to be removed
                            fixCode = "Replace With";
                            fixDetail = eventualTarget;
                        }
                    }
                }
                else if (address.StatusCode.ToString().StartsWith('4'))
                {
                    problemCode = "Missing URL";
                    problemDetail = address.Url;
                    fixCode = "Unknown";
                    fixDetail = "Unknown";
                }
                else
                {
                    problemCode = "Server Error: " + address.StatusCode.ToString();
                    problemDetail = address.Url;
                    fixCode = "Unknown";
                    fixDetail = "Unknown";
                }

                // Every address which links to the current address has this problem

                foreach (string inboundUrl in address.InboundUrls.Split('|'))
                {
                    var item = new SummaryData()
                    {
                        Page = inboundUrl,
                        ProblemCode = problemCode,
                        ProblemDetail = problemDetail,
                        FixCode = fixCode,
                        FixDetail = fixDetail
                    };
                    summary.Add(item);
                }

            }

            return summary;
        }

        private class SummaryData
        {
            public string Page;
            public string ProblemCode;
            public string ProblemDetail;
            public string FixCode;
            public string FixDetail;
        }

        private Dictionary<string, string> GenerateRedirectResolver(Dictionary<string, Address> addresses)
        {
            var redirectResolver = new Dictionary<string, string>();
            foreach (Address address in addresses.Values)
            {
                logger.LogTrace(address.Url);
                if (!address.StatusCode.ToString().StartsWith('3')) continue;
                logger.LogTrace("3xx: " + address.Url);

                string begin = address.Url;
                string end;
                Address current = address;
                List<string> visited = new();
                while (true)
                {
                    Helpers.DebugPrint(current);

                    // Handle null redirect (which is what we record when the location header is a naked slash "/")
                    if (current.OutboundUrls is null)
                    {
                        end = "NULL VALUE";
                        break;
                    }

                    // Handle redirect to self (which should never happen, but does...)
                    if (current.Url == current.OutboundUrls)
                    {
                        end = current.OutboundUrls;
                        break;
                    }

                    // Handle trivial (ADD_SLASH) redirects
                    if (current.OutboundUrls == "ADD_SLASH")
                    {
                        end = current.Url + '/';
                        break;
                    }

                    // Move along the redirect chain
                    current = addresses[current.OutboundUrls];
                    logger.LogTrace("-> " + current.Url);

                    // Are we stuck in a redirect loop?
                    if (visited.Contains(current.Url))
                    {
                        logger.LogTrace("Groundhog Day!");
                        end = "LOOP: " + current.Url;
                        break;
                    }
                    visited.Add(current.Url);

                    // If we get to somewhere that doesn't redirect
                    // then we have reached the end of the chain
                    // (which may not necessarily have a 200 status)
                    if (!current.StatusCode.ToString().StartsWith('3'))
                    {
                        end = current.Url;
                        visited = new();
                        break;
                    }
                }
                redirectResolver[begin] = end;
            }
            return redirectResolver;
        }

    }
}
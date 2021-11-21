using System;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Linq;
using System.Collections.Generic;

namespace LinkChecker.ConsoleApp
{
    class LinkChecker
    {
        private readonly IConfiguration config;
        private readonly ILogger<LinkChecker> logger;
        private readonly Network network;

        private LinkCheckerContext context;

        private readonly string rootUrl;
        private readonly Uri rootUri;

        public LinkChecker(IConfiguration _config, ILogger<LinkChecker> _logger, Network _network)
        {
            config = _config;
            logger = _logger;
            network = _network;

            rootUrl = _config["root"];
            rootUri = new Uri(rootUrl);

            // Try adding root
            using (context = new LinkCheckerContext(rootUrl))
            {
                var results = context.Addresses.Where(a => a.Url == rootUrl);
                if (!results.Any())
                {
                    logger.LogDebug("Adding root");
                    var root = new Address { Url = rootUrl };
                    context.Add(root);
                    context.SaveChanges();
                }
            }
        }

        public async Task ScanHeaders(Address address)
        {
            logger.LogTrace("Begin ScanHeaders {0}", address.Url);

            HttpResponseMessage response = await network.GetUriHeaders(new Uri(address.Url));
            address.StatusCode = (int)response.StatusCode;
            address.ContentType = response.Content.Headers.ContentType?.ToString() ?? "";

            logger.LogDebug("{0}: {1}", address.StatusCode, address.Url);

            // Were we redirected?

            if ((address.StatusCode >= 300) && (address.StatusCode <= 399))
            {
                // Record the pointed-to Address as an outbound link

                logger.LogTrace("Redirect found!");

                string newUrl = response.Headers.Location.ToString();

                // Check it is properly formed

                if (newUrl.StartsWith('/')) { newUrl = rootUrl.TrimEnd('/') + '/' + newUrl.TrimStart('/'); }
                logger.LogTrace("Redirects to: {0}", newUrl);

                // If it redirects to the rootUrl then
                // don't record it as an inbound Url for that page

                if (newUrl == rootUrl) goto End;

                // Create the Link record

                if (newUrl == address.Url + '/')
                {
                    // If the redirect trivially adds a slash then it's
                    // helpful to record that instead of the "new" address
                    address.OutboundUrls = "ADD_SLASH";
                    logger.LogTrace("Trivial Redirect link created");
                }
                else
                {
                    address.OutboundUrls = newUrl;
                    logger.LogTrace("Redirect link created");
                }

                // Create new Address for redirect target if required

                Address newAddress;
                try
                {
                    newAddress = context.Addresses.Single(a => a.Url == newUrl);
                    newAddress.InboundUrls = (newAddress.InboundUrls + "|" + address.Url).TrimStart('|');
                }
                catch
                {
                    newAddress = new Address { Url = newUrl, InboundUrls = address.Url };
                    context.Add(newAddress);
                }
            }

            End:

            // Track this Scan

            address.MetaLastScanned = DateTime.Now;
            context.SaveChanges();
            logger.LogTrace("End ScanHeaders");
            
        }

        public async Task ScrapeContent(Address address)
        {
            logger.LogTrace("Begin ScrapeContent {0}", address.Url);

            // Identify the Hrefs

            string content = await network.GetUriContent(new Uri(address.Url));
            var hrefs = Helpers.GetInternalHrefs(rootUri, content);

            // Replace any previously found links
            logger.LogTrace("Replacing existing links");
            address.OutboundUrls = string.Join("|", hrefs);

            // Create new Address for outbound links if required

            logger.LogTrace("Creating Address for outbound links");
            // We will save the newAddresses to the DB in batch
            List<Address> newAddresses = new();
            foreach (string newUrl in hrefs)
            {
                Address newAddress;
                try
                {
                    newAddress = context.Addresses.Single(a => a.Url == newUrl);
                    newAddress.InboundUrls = (newAddress.InboundUrls + "|" + address.Url).TrimStart('|');
                }
                catch
                {
                    newAddress = new Address { Url = newUrl, InboundUrls = address.Url };
                    newAddresses.Add(newAddress);
                }
            }
            // Quicker than doing context.Add() inside the foreach loop
            context.AddRange(newAddresses);
            
            // Track this Scrape

            address.MetaLastScraped = DateTime.Now;
            context.SaveChanges();
            logger.LogTrace("End ScrapeContent");
        }

        public async Task SpiderSite()
        {
            logger.LogInformation("Begin spider");

            int limit = int.Parse(config["limit"]);
            int maxScanAge = int.Parse(config["maxScanAge"]);
            int maxScrapeAge = int.Parse(config["maxScrapeAge"]);

            int counter = 0;

            while (true)
            {
                // Create a new context per batch to ensure early garbage disposal
                using (context = new LinkCheckerContext(rootUrl))
                {
                    var addressBatch = context.Addresses.OrderBy(x => x.MetaLastScanned).Take(100);

                    foreach (Address address in addressBatch)
                    {
                        logger.LogDebug(address.Url);

                        counter++;
                        if (counter % 10 == 0) logger.LogInformation("Counter: {0}", counter);
                        // Stop if we've done enough work this run
                        if (counter >= limit) goto End;

                        // Scan?

                        if (DateTime.Now.Subtract(address.MetaLastScanned).TotalDays < maxScanAge) continue;

                        logger.LogTrace("Scanning: {0}", address.Url);
                        await ScanHeaders(address);
                        // Try to avoid being bounced for aggressive spidering
                        Helpers.RandomSleep();

                        // Scrape?

                        if (DateTime.Now.Subtract(address.MetaLastScraped).TotalDays < maxScrapeAge) continue;
                        // Don't scrape external addresses
                        if (!address.Url.StartsWith(rootUri.ToString())) continue;
                        // Can't scrape a 3xx redirection response
                        if (address.StatusCode.ToString().StartsWith("3")) continue;
                        // Don't scrape non-HTML addresses
                        if (address.ContentType.StartsWith("text/html") != true) continue;

                        logger.LogTrace("Scraping: {0}", address.Url);
                        await ScrapeContent(address);
                        // Try to avoid being bounced for aggressive spidering
                        Helpers.RandomSleep();
                    }
                }

            }

            End:

            logger.LogInformation("\nDone");

        }
        
    }
}

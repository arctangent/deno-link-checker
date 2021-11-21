using System;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LinkChecker.ConsoleApp
{
    interface INetwork
    {
        public Task<HttpResponseMessage> GetUriHeaders(Uri uri);
        public Task<string> GetUriContent(Uri uri);
    }

    class Network : INetwork
    {
        private readonly HttpClientHandler Handler;
        private readonly HttpClient Client;

        public Network(IConfiguration _config, ILogger<LinkChecker> _logger)
        {
            Handler = new() { AllowAutoRedirect = false };
            Client = new(Handler);
        }

        public async Task<HttpResponseMessage> GetUriHeaders(Uri uri)
        {
            HttpRequestMessage request = new(HttpMethod.Head, uri);
            var response = await Client.SendAsync(request);
            return response;
        }

        public async Task<string> GetUriContent(Uri uri)
        {
            HttpResponseMessage response = await Client.GetAsync(uri);
            var content = await response.Content.ReadAsStringAsync();
            return content;
        }
    }

}
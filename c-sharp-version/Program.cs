using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace LinkChecker.ConsoleApp
{

    class Program {

        static async Task Main(string[] args)
        {
            var host = CreateHostBuilder(args).Build();
            host.Services.GetRequiredService<Initialiser>().Init();

            // TODO: Better way to capture command line arguments?
            // TODO: This causes an error if there are no args
            if (args[0]=="report") {
                Console.WriteLine("REPORT arg detected");
                host.Services.GetRequiredService<ReportBuilder>().Generate();
            }
            else
            {
                await host.Services.GetRequiredService<LinkChecker>().SpiderSite();
            }
        }

        private static IHostBuilder CreateHostBuilder(string[] args)
        {
            return Host.CreateDefaultBuilder(args)
                .ConfigureServices(services =>
                {
                    services.AddSingleton<Initialiser>();
                    services.AddSingleton<LinkChecker>();
                    services.AddSingleton<Network>();
                    services.AddSingleton<ReportBuilder>();
                });
        }

    }
}
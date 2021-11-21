using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LinkChecker.ConsoleApp
{

    public class Initialiser
    {
        private readonly IConfiguration config;
        private readonly ILogger<Initialiser> logger;

        public Initialiser(IConfiguration _config, ILogger<Initialiser> _logger)
        {
            config = _config;
            logger = _logger;
        }

        public void Init()
        {
            var context = new LinkCheckerContext(config["root"]);

            if (bool.Parse(config["flush"]) == true)
            {
                logger.LogInformation("Flushing previous DB");
                context.Database.EnsureDeleted();
            }
            logger.LogDebug("Ensuring DB exists");
            context.Database.EnsureCreated();
        }

    }

}
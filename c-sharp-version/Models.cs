using System;
using Microsoft.EntityFrameworkCore;

namespace LinkChecker.ConsoleApp
{

    public class LinkCheckerContext : DbContext
    {
        public DbSet<Address> Addresses { get; set; }

        private readonly string _file;

        public LinkCheckerContext(string rootUrl)
        {
            _file = new Uri(rootUrl).Host + ".db";
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.UseSqlite("Data Source=" + _file);
        }

    }

    public class Address
    {
        public int AddressId { get; set; }
        public string Url { get; set; }
        public int StatusCode { get; set; }
        public string ContentType { get; set; }

        // SQLite can't handle DateTimeOffset properly,
        // so we will expect events scan/scrape events
        // may trigger early/late when clocks change
        public DateTime MetaLastScanned { get; set; }
        public DateTime MetaLastScraped { get; set; }

        // Hopefully this approach lets us store data quicker
        // (although it may well take longer to pull back out...)
        // TODO: Could I use a ValueConverter to transform
        //       from string <--> List<string> to make code tidier?
        public string InboundUrls { get; set; }
        public string OutboundUrls { get; set; }
    }

}

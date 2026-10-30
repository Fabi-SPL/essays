# Essays

Write-ups of things I measured, mostly bugs that turned out to be more interesting than they first looked. Each one is here as a PDF and as markdown.

Every PDF is a single continuous page. Nothing breaks across a page boundary, because there are no page boundaries.

| | Read |
|---|---|
| **A sync bug that erased the data it had just refused to read**<br>99.3% of records were rejected on arrival. The app then acknowledged the delete, so the strap wiped its own buffer. Neither bug was interesting alone. | [PDF](pdf/01-sync-bug-that-erased-the-data.pdf) · [md](src/01-sync-bug-that-erased-the-data.md) |
| **Fifty sleeps of 3.2 ms took 756 ms, and that is why I deleted my RTP pacer**<br>The pacer was right in theory and destructive in practice, because Windows rounds every short sleep up to 15.6 ms. | [PDF](pdf/07-the-pacer-i-deleted.pdf) · [md](src/07-the-pacer-i-deleted.md) |
| **Four weather APIs, one postcode, 5.7 degrees apart**<br>Same coordinates, same minute, a 5.7 °C spread in reported current temperature. One provider reported zero rain while the others reported rain. | [PDF](pdf/02-four-weather-apis.pdf) · [md](src/02-four-weather-apis.md) |

## Elsewhere

The code behind several of these lives in my other repositories. [remote-desktop](https://github.com/Fabi-SPL/remote-desktop) holds the pacer that got deleted, [whoop-ble-swift](https://github.com/Fabi-SPL/whoop-ble-swift) the BLE protocol work, [argus](https://github.com/Fabi-SPL/argus) the vendor-API layer.

Some of these first appeared on my studio site, [keled.de](https://keled.de). The canonical copies live here.

## License

CC BY-NC-ND 4.0. Share them, credit me, do not sell them, and do not publish altered versions. See [`LICENSE`](LICENSE).

[Fabi-SPL](https://github.com/Fabi-SPL)

# FrozenXiami

> New workflow automated using Node.js and GitHub Actions has been introduced in the current `main` branch, and unnecessary changes are excluded from the history. All the previous changes can be found in `old` branch.

Fully local web application to browse music data gathered from [ArchivedXiami](https://github.com/WRtux/ArchivedXiami), featuring similar UI to late Xiami Music.

## Features

* **Direct and fully local experience:** The whole application is by design able to be launched locally and directly (using `file` scheme). No Electron and no installation required, just open the built `main.html` with a modern browser.
* **Lightweight and simple:** No reactive framework used, modern features of browsers adopted to cut down mess, and efficient data processing providing swift experience just like regular music applications.
* **Advanced searching, ranking and statistics.** Discover new things beyond music.
* And also, **purely Xiami-flavored layout and theme.**

## Usage

> The application can no longer be launched from the source files.

> The demo site is still under development.

The files in this repository only include the source code and other necessary assets needed to work on the project. To try out the application, visit [the demo site](https://xiami.frozen.cool/) (fully implemented, demo data publicly available) or download the automated builds from [the Actions page](https://github.com/WRtux/FrozenXiami/actions) and open `main.html`. To work on it, install the environment first and use Gulp to build the application.

**The source code is not a complete implementation of the application.** Currently, [the loader worker](/source/web/loader.worker.js) is not implemented in this repository, as the standard index format is not specified in ArchivedXiami.  
Additional implemention of the above and rebuilding are required to operate all the functions in the application.

## Licensing

Unless otherwise stated, all the source code and related files are provided under [the MPL License](/LICENSE.txt).

# VSCode Extension Filter Line

Filter line for current opening file by strings/regular expressions, generating the result in a new file.
Commonly used for log analysis.

*🌟Warning: Some features depend on **[ripgrep](https://github.com/BurntSushi/ripgrep)**. Add **[ripgrep](https://github.com/BurntSushi/ripgrep)** to **SYSTEM PATH** only if those features aren't working.*

## **Features**
1. Support large file filter
2. Support folder filte line
3. Filter line by input string (or not contain input string).
4. Filter line by input regular expression (or not match input regular expression).
5. Support showing context lines in the filter line view
6. Supports multiline matching when regex expressions include '(?s)', for example: (?s)BEGIN.*?END


## Usage
1. Alt + F: filter to lines machting
2. Alt + Shift + F： filter to lines not machting
3. F12：display surrounding lines of the selected target line
![list](img/commandlist.png)


### 1. Large file mode
* Perfect support large file filter, but ensure the file is saved before proceeding.

### 2. Support folder filte line.
![searchdir](img/searchdir.gif)

### 3. Filter line by input string.
1. Alt + F: filter to lines machting
2. Type a string and hit `<Enter>`.

![bystring](img/bystring.gif)

### 4. Filter line by input regex.
1. Alt + F: filter to lines machting
2. Type a regular expression and hit `<Enter>`.

![byregex](img/byregex.gif)

### 5. Support showing context lines in the filter line view.
1. Line currently targeted for selection
2. F12: Display surrounding lines of the selected target line

![contextlines](img/contextlines.gif)




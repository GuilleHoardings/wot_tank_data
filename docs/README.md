# How to export

In order to have a custom.css, I had to change the file `<venv>\share\jupyter\nbconvert\templates\lab\index.html.j2`, adding this line just before
`</head>`:

    <link rel="stylesheet" href="custom.css">

In order to export a notebook to be published, run this command from the root directory:

    jupyter nbconvert --to=html '.\1 General analysis.ipynb' --no-input --no-prompt --output "docs/1-General-analysis.html"

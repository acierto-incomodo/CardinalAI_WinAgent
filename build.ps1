# Asegúrate de que PyInstaller esté en PATH
$env:PATH += ";C:\Users\melio\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\Scripts"

# Ejecuta PyInstaller con icono, modo ventana, y un solo archivo
pyinstaller --onefile --windowed --icon=cardinal.ico --add-data "cardinal.ico;." cardinal.py
import zipfile
from pathlib import Path

def package():
    static_dir = Path("static")
    zip_path = Path("deploy.zip")
    
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(static_dir.rglob("*")):
            if file_path.is_file():
                # 1. Forward-slash path relative to static/ (root in Amplify S3)
                rel_posix = file_path.relative_to(static_dir).as_posix()
                zf.write(file_path, arcname=rel_posix)
                
                # 2. Forward-slash static/ alias (for legacy /static/... requests)
                static_alias = f"static/{rel_posix}"
                zf.write(file_path, arcname=static_alias)

        # Amplify Hosting reads this file from the artifact root for response
        # security headers. The build pipeline copies it into static/; include
        # it explicitly for the manual deployment path as well.
        custom_headers_file = Path("customHttp.yml")
        if custom_headers_file.is_file():
            zf.write(custom_headers_file, arcname=custom_headers_file.name)

    # Verification: check all entries use forward slash and no backslash
    with zipfile.ZipFile(zip_path, "r") as zf:
        for info in zf.infolist():
            assert "\\" not in info.filename, f"Found backslash in zip entry: {info.filename}"
        sample_entries = [info.filename for info in zf.infolist() if "buttercup" in info.filename]
        print(f"Verified {len(zf.infolist())} entries in {zip_path}. Size: {zip_path.stat().st_size:,} bytes.")
        print(f"Sample Buttercup entries: {sample_entries}")

if __name__ == "__main__":
    package()

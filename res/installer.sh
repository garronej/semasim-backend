#!/bin/bash

# wget -q -O - [dev.]semasim.com/installer.sh | sudo bash
# wget -q -O - [dev.]semasim.com/installer.sh | sudo FETCH_ONLY=1 bash

# TODO: Test if debian or ubuntu distribution comply to requirements.

INSTALL_PATH=/usr/share/semasim
TARBALL_PATH=/tmp/semasim.tar.gz

if [[ $EUID -ne 0 ]]; then
    echo "This script require root privileges."
    exit 1
fi

echo "We will now download and install semasim, it may take some time."

if [ -d "$INSTALL_PATH" ]; then

    echo "Directory $INSTALL_PATH already exsist, uninstalling previous install"
    
    semasim_uninstaller run 2>/dev/null
    
    rm -rf $INSTALL_PATH

fi

URL="semasim.com/semasim_"$(uname -m)".tar.gz"

wget $URL -q --show-progress -O $TARBALL_PATH

mkdir $INSTALL_PATH

tar -xzf $TARBALL_PATH -C $INSTALL_PATH

rm $TARBALL_PATH

cd $INSTALL_PATH

if [ -n "$FETCH_ONLY" ] 
then
        echo "cd $(pwd) && ./node dist/bin/installer install --help"
else
        ./node dist/bin/installer install
fi
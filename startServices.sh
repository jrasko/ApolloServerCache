#!/bin/bash
gnome-terminal -- node colorservice/index.js
gnome-terminal -- node nameservice/index.js
sleep 1
gnome-terminal -- node gateway/build/index.js

#!/bin/bash

set -e

echo "Syncing AGS and Hyprland configs to dotfiles..."

rsync -av --delete ".config/ags/" "Valentine-Arch-One-Click-Setup/ags/"
rsync -av --delete ".config/hypr/" "Valentine-Arch-One-Click-Setup/hypr/"
rsync -av --delete ".config/kitty/" "Valentine-Arch-One-Click-Setup/kitty/"

# zsh
rsync -av --delete ".zshrc" "Valentine-Arch-One-Click-Setup/zsh/"
rsync -av --delete ".p10k.zsh" "Valentine-Arch-One-Click-Setup/zsh/"
rsync -av --delete ".oh-my-zsh/" "Valentine-Arch-One-Click-Setup/zsh/oh-my-zsh"

echo "Sync complete. Remember to commit your changes:"


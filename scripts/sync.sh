#!/bin/bash

set -e

echo "Syncing AGS and Hyprland configs to dotfiles..."

rsync -av --delete ".config/ags/" "arch-shell-setup-repo/ags/"
rsync -av --delete ".config/hypr/" "arch-shell-setup-repo/hypr/"
rsync -av --delete ".config/kitty/" "arch-shell-setup-repo/kitty/"

# zsh
rsync -av --delete ".zshrc" "arch-shell-setup-repo/zsh/"
rsync -av --delete ".p10k.zsh" "arch-shell-setup-repo/zsh/"
rsync -av --delete ".oh-my-zsh/" "arch-shell-setup-repo/zsh/.oh-my-zsh"

echo "Sync complete. Remember to commit your changes:"


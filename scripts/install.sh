#!/bin/bash

# ======================================
#  Arch Linux Valentine Setup Installer
# ======================================

# Parse flags
UNATTENDED=false
for arg in "$@"; do
    [[ "$arg" == "-y" || "$arg" == "--yes" ]] && UNATTENDED=true
done

NOCONFIRM=""
$UNATTENDED && NOCONFIRM="--noconfirm"

echo "======================================"
echo " Arch Linux Valentine Setup Installer "
echo "======================================"
echo ""

# Helper: check if a package is installed (pacman or AUR via yay)
is_installed() {
    pacman -Qi "$1" &>/dev/null || (command -v yay &>/dev/null && yay -Qi "$1" &>/dev/null)
}

echo "Updating system and installing base dependencies..."
sudo pacman -Syu --needed $NOCONFIRM base-devel git
echo ""

echo "Installing yay (AUR helper)..."
if ! command -v yay &>/dev/null; then
    git clone https://aur.archlinux.org/yay.git
    cd yay || { echo "ERROR: Failed to enter yay directory."; exit 1; }
    makepkg -si $NOCONFIRM
    cd ..
    rm -rf yay
else
    echo "yay is already installed."
fi
echo ""

echo "Detecting GPU..."
echo "Select your GPU:"
echo "1) NVIDIA"
echo "2) AMD"
echo "3) Intel"
read -r gpu_choice
case $gpu_choice in
    1)
        echo "Installing NVIDIA drivers..."
        yay -S --needed $NOCONFIRM nvidia-open nvidia-settings nvidia-utils
        ;;
    2)
        echo "Installing AMD drivers..."
        sudo pacman -S --needed $NOCONFIRM mesa vulkan-radeon rocm-smi-lib
        ;;
    3)
        echo "Installing Intel drivers..."
        sudo pacman -S --needed $NOCONFIRM mesa vulkan-intel
        ;;
    *)
        echo "Invalid choice. Skipping GPU drivers."
        ;;
esac
echo ""

echo "Checking installed packages..."
echo ""

PACKAGES=(
    networkmanager
    network-manager-applet
    bluez
    bluez-utils
    pipewire
    pipewire-alsa
    pipewire-pulse
    pipewire-jack
    wireplumber
    gst-plugin-pipewire
    unicode-emoji
    noto-fonts
    noto-fonts-emoji
    noto-fonts-cjk
    ttf-jetbrains-mono-nerd
    kitty
    nautilus
    zsh
    hyprland
    polkit
    xdg-utils
    xdg-desktop-portal
    xdg-desktop-portal-hyprland
    xdg-desktop-portal-gtk
    hyprshutdown
    awww
    aylurs-gtk-shell-git
    cava
    pavucontrol
    playerctl
    blueman
    tree
    rsync
    usbutils
    wl-clipboard
    imagemagick
    ffmpegthumbnailer
    libastal-network-git
    libastal-bluetooth-git
    libastal-hyprland-git
    libastal-apps-git
    libastal-cava-git
    libastal-mpris-git
    libastal-battery-git
    btop-gpu-git
    libgtop
    libastal-wireplumber-git
    libnotify
    libastal-notifd-git
)

MISSING_PACKAGES=()

set +e
for pkg in "${PACKAGES[@]}"; do
    if is_installed "$pkg"; then
        echo "[OK]  $pkg"
    else
        echo "[NEW] $pkg"
        MISSING_PACKAGES+=("$pkg")
    fi
done
set -e

echo ""
if [ ${#MISSING_PACKAGES[@]} -eq 0 ]; then
    echo "All packages already installed. Nothing to do."
else
    echo "Packages that will be installed:"
    printf '  %s\n' "${MISSING_PACKAGES[@]}"
    echo ""

    FINAL_PACKAGES=()

    echo "Package selection phase"
    echo "If you want to skip a package, type "skip". Press ENTER to keep it."
    echo ""

    for pkg in "${MISSING_PACKAGES[@]}"; do
        read -r -p "Skip '$pkg'? " input || true
        if [[ "$input" == "skip" ]]; then
            echo "  Skipping $pkg"
        else
            FINAL_PACKAGES+=("$pkg")
        fi
    done

    echo ""
    echo "Final install list:"
    printf '  %s\n' "${FINAL_PACKAGES[@]}"
    echo ""

    echo "Installing packages..."
    if [ ${#FINAL_PACKAGES[@]} -eq 0 ]; then
        echo "Nothing to install."
    else
        yay -S --needed $NOCONFIRM "${FINAL_PACKAGES[@]}"
    fi
fi
echo ""

echo "Browser selection:"
echo "1) Firefox"
echo "2) Google Chrome (AUR)"
echo "3) Brave (AUR)"
echo "4) Zen Browser (AUR)"
echo "5) Skip"
read -r browser_choice
case $browser_choice in
    1) yay -S --needed $NOCONFIRM firefox ;;
    2) yay -S --needed $NOCONFIRM google-chrome ;;
    3) yay -S --needed $NOCONFIRM brave-bin ;;
    4) yay -S --needed $NOCONFIRM zen-browser-bin ;;
    *) echo "Skipping browser installation." ;;
esac
echo ""

echo "Optional applications:"
read -r -p "Install Obsidian? (y/n): " obsidian || true
if [[ "$obsidian" == "y" ]]; then
    yay -S --needed $NOCONFIRM obsidian
else
    echo "Skipping Obsidian."
fi

read -r -p "Install VS Code? (y/n): " code || true
if [[ "$code" == "y" ]]; then
    yay -S --needed $NOCONFIRM visual-studio-code-bin
else
    echo "Skipping VS Code."
fi

read -r -p "Install Vesktop? (y/n): " vesktop || true
if [[ "$vesktop" == "y" ]]; then
    yay -S --needed $NOCONFIRM vesktop
else
    echo "Skipping Vesktop."
fi
echo ""

echo "Deploying dotfiles..."
DOTFILES=(ags hypr kitty)
for dir in "${DOTFILES[@]}"; do
    if [ -d "./$dir" ]; then
        mkdir -p ~/.config
        cp -r "./$dir" ~/.config/
        echo "  Deployed $dir -> ~/.config/$dir"
    else
        echo "  Warning: ./$dir not found, skipping."
    fi
done

if [ -d "./zsh" ]; then
    cp ./zsh/.zshrc "$HOME/.zshrc"
    cp ./zsh/.p10k.zsh "$HOME/.p10k.zsh"
    echo "  Deployed .zshrc and .p10k.zsh -> ~/"
else
    echo "  Warning: ./zsh not found, skipping."
fi

echo "Deploying oh-my-zsh..."
if [ -d "./zsh/oh-my-zsh" ]; then
    if [ ! -d "$HOME/.oh-my-zsh" ]; then
        git clone https://github.com/ohmyzsh/ohmyzsh.git "$HOME/.oh-my-zsh"
        echo "  Cloned fresh oh-my-zsh"
    else
        echo "  ~/.oh-my-zsh already exists, skipping clone"
    fi
    rsync -av --no-links ./zsh/oh-my-zsh/custom/ "$HOME/.oh-my-zsh/custom/"
    echo "  Deployed custom/ -> ~/.oh-my-zsh/custom/"
else
    echo "  Warning: ./zsh/oh-my-zsh not found, skipping."
fi

echo ""
echo "Setting Zsh as default shell..."
chsh -s "$(which zsh)"
echo ""

echo "======================================"
echo " Setup complete!"
echo " Please log out and back in (or reboot)"
echo " for all changes to take effect."
echo "======================================"

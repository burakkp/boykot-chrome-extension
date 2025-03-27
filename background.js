// Varsayılan firma listesi
// fetch('https://burakkp.github.io/boykot-firma-listesi/firma-listesi.json')
let firmaIliskileri = {};
let aktifUyari = null;

// Firma listesini güncelleyen fonksiyon
function guncelleFirmaListesi() {
  fetch('https://burakkp.github.io/boykot-firma-listesi/firma-listesi.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ağ yanıtı başarısız: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      firmaIliskileri = data.firmalar;
      const updateTime = new Date().toLocaleString('tr-TR');
      chrome.storage.local.set({ firmaListesi: data.firmalar, lastUpdated: updateTime }, () => {
        console.log('Firma listesi güncellendi:', updateTime);
      });
    })
    .catch(error => {
      console.error('Liste güncellenemedi:', error);
      chrome.storage.local.get(['firmaListesi'], (result) => {
        if (result.firmaListesi) {
          firmaIliskileri = result.firmaListesi;
          console.log('Yerel depodan firma listesi yüklendi.');
        }
      });
    });
}

// İlk yüklemede listeyi al
guncelleFirmaListesi();

// Bildirimi göster
function bildirimiGoster(firma) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon48.png",
    title: "Firma Tespit Edildi",
    message: `Bu site ${firma} firmasına aittir veya ilişkili bir firmadır.`
  }, (notificationId) => {
    console.log(`Bildirim oluşturuldu: ${notificationId}`);
  });
}

// Periyodik uyarıyı başlat
function periyodikUyariBaslat(firma, tabId) {
  if (aktifUyari) clearInterval(aktifUyari);
  bildirimiGoster(firma);
  aktifUyari = setInterval(() => {
    chrome.tabs.get(tabId, (tab) => {
      if (tab && tab.url && kontrolEt(tab.url) === firma) {
        bildirimiGoster(firma);
      } else {
        clearInterval(aktifUyari);
        aktifUyari = null;
        console.log('Periyodik uyarı durduruldu.');
      }
    });
  }, 30000);
}

// URL kontrol fonksiyonu
function kontrolEt(url) {
  let hostname, path;
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname;
    path = parsedUrl.pathname.split('/')[1] || '';
    console.log(`Kontrol edilen URL: ${url}`);
    console.log(`Hostname: ${hostname}, Path: ${path}`);
  } catch (error) {
    console.error('URL ayrıştırma hatası:', error);
    return null;
  }

  if (!firmaIliskileri || Object.keys(firmaIliskileri).length === 0) {
    console.warn('Firma listesi henüz yüklenmedi.');
    return null;
  }

  for (const [anaFirma, detay] of Object.entries(firmaIliskileri)) {
    // Tepe firma kontrolü
    if (detay.domain && detay.domain.some(d => hostname === d || hostname.endsWith("." + d))) {
      console.log(`Tepe firma domain eşleşti: ${anaFirma}`);
      return `${anaFirma} (Web Sitesi)`;
    }
    if (detay.socialMedia) {
      const twitterMatch = (hostname === "twitter.com" || hostname === "x.com") &&
                          detay.socialMedia.twitter &&
                          detay.socialMedia.twitter.toLowerCase() === path.toLowerCase();
      const instagramMatch = hostname === "instagram.com" &&
                             detay.socialMedia.instagram &&
                             detay.socialMedia.instagram.toLowerCase() === path.toLowerCase();
      const facebookMatch = hostname === "facebook.com" &&
                            detay.socialMedia.facebook &&
                            detay.socialMedia.facebook.toLowerCase() === path.toLowerCase();

      console.log(`Tepe firma sosyal medya kontrolü - ${anaFirma}: Twitter: ${twitterMatch}, Instagram: ${instagramMatch}, Facebook: ${facebookMatch}`);

      if (twitterMatch) {
        return `${anaFirma} (Twitter/X Hesabı)`;
      }
      if (instagramMatch) {
        return `${anaFirma} (Instagram Hesabı)`;
      }
      if (facebookMatch) {
        return `${anaFirma} (Facebook Hesabı)`;
      }
    }

    // Alt firmalar kontrolü
    for (const [kategori, altFirmalar] of Object.entries(detay.altFirmalar)) {
      for (const [altFirma, info] of Object.entries(altFirmalar)) {
        if (info.domains && info.domains.some(d => hostname === d || hostname.endsWith("." + d))) {
          console.log(`Alt firma domain eşleşti: ${anaFirma} - ${altFirma}`);
          return `${anaFirma} - ${altFirma} (Web Sitesi)`;
        }
        if (info.socialMedia) {
          const twitterMatch = (hostname === "twitter.com" || hostname === "x.com") &&
                              info.socialMedia.twitter &&
                              info.socialMedia.twitter.toLowerCase() === path.toLowerCase();
          const instagramMatch = hostname === "instagram.com" &&
                                 info.socialMedia.instagram &&
                                 info.socialMedia.instagram.toLowerCase() === path.toLowerCase();
          const facebookMatch = hostname === "facebook.com" &&
                                info.socialMedia.facebook &&
                                info.socialMedia.facebook.toLowerCase() === path.toLowerCase();

          console.log(`Alt firma sosyal medya kontrolü - ${altFirma}: Twitter: ${twitterMatch}, Instagram: ${instagramMatch}, Facebook: ${facebookMatch}`);

          if (twitterMatch) {
            return `${anaFirma} - ${altFirma} (Twitter/X Hesabı)`;
          }
          if (instagramMatch) {
            return `${anaFirma} - ${altFirma} (Instagram Hesabı)`;
          }
          if (facebookMatch) {
            return `${anaFirma} - ${altFirma} (Facebook Hesabı)`;
          }
        }
      }
    }
  }
  console.log(`Eşleşme bulunamadı: ${url}`);
  return null;
}

// Web navigasyonunu dinle
chrome.webNavigation.onCompleted.addListener((details) => {
  const url = details.url;
  console.log(`Sayfa yüklendi, URL: ${url}`);
  const firma = kontrolEt(url);
  if (firma) {
    periyodikUyariBaslat(firma, details.tabId);
  }
}, { url: [{ urlMatches: 'https://*/*' }, { urlMatches: 'http://*/*' }] });

// Sekme değiştiğinde kontrol
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      console.log(`Sekme değişti, URL: ${tab.url}`);
      if (aktifUyari) clearInterval(aktifUyari);
      const firma = kontrolEt(tab.url);
      if (firma) {
        periyodikUyariBaslat(firma, activeInfo.tabId);
      }
    }
  });
});

// Mesaj dinleyici
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "guncelle") {
    guncelleFirmaListesi();
    sendResponse({ status: "Güncelleme başlatıldı" });
  } else if (request.action === "kontrol") {
    const firma = kontrolEt(request.url);
    sendResponse({ firma: firma });
  }
});

// İlk yüklemede listeyi al
guncelleFirmaListesi();
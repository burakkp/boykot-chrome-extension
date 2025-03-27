// Google Analytics Measurement Protocol ile olay gönderimi
function trackEvent(eventName, eventCategory, eventLabel) {
    const measurementId = 'G-58WQ1ZJN7T'; // Measurement ID’nizi buraya ekleyin
    const apiSecret = 'YOUR_API_SECRET'; // Google Analytics’ten API Secret alın
    const clientId = 'random-client-id-' + Math.random().toString(36).substr(2); // Benzersiz bir ID oluşturun
  
    fetch('https://www.google-analytics.com/mp/collect?measurement_id=' + measurementId + '&api_secret=' + apiSecret, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        events: [{
          name: eventName,
          params: {
            event_category: eventCategory,
            event_label: eventLabel
          }
        }]
      })
    }).catch(error => {
      console.warn('Analytics olayı gönderilemedi:', error);
    });
  }

  
  // Aktif siteyi kontrol et
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    chrome.runtime.sendMessage({ action: "kontrol", url: url }, (response) => {
      document.getElementById('aktifSite').textContent = response.firma 
        ? `Aktif site: ${response.firma}` 
        : "Aktif site: Listede bir firma tespit edilmedi.";
      trackEvent('Site Check', 'Popup Opened', response.firma || 'No Match');
    });
  });
  
  // Son güncelleme tarihini göster
  function updateLastUpdated() {
    chrome.storage.local.get(['lastUpdated'], (result) => {
      const sonGuncelleme = result.lastUpdated || 'Henüz güncellenmedi';
      document.getElementById('sonGuncelleme').textContent = `Son Güncelleme: ${sonGuncelleme}`;
    });
  }

  // Popup açıldığında son güncellemeyi göster
  updateLastUpdated();
  
  // Güncelleme butonu
  document.getElementById('guncelleBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "guncelle" }, (response) => {
      alert(response.status);
      trackEvent('Button Click', 'Update List', 'Clicked');
      updateLastUpdated(); // Güncelleme tamamlandığında zamanı yenile
    });
  });
  
  // Tüm listeyi göster butonu
  document.getElementById('listeBtn').addEventListener('click', () => {
    chrome.storage.local.get(['firmaListesi'], (result) => {
      const firmaListesiDiv = document.getElementById('firmaListesi');
      if (firmaListesiDiv.innerHTML) {
        firmaListesiDiv.innerHTML = ''; // Liste açıksa kapat
        trackEvent('Button Click', 'Hide List', 'Clicked');
      } else {
        const container = document.createElement('div');
        for (const [anaFirma, detay] of Object.entries(result.firmaListesi || {})) {
          const anaBaslik = document.createElement('h3');
          anaBaslik.textContent = anaFirma;
          container.appendChild(anaBaslik);
  
          for (const [kategori, altFirmalar] of Object.entries(detay.altFirmalar)) {
            const kategoriBaslik = document.createElement('h4');
            kategoriBaslik.textContent = kategori;
            container.appendChild(kategoriBaslik);
  
            const ul = document.createElement('ul');
            for (const [altFirma, info] of Object.entries(altFirmalar)) {
              const li = document.createElement('li');
  
              // Domainler ve sosyal medya hesaplarını birleştir
              let detayText = `${altFirma}: `;
              if (info.domains && info.domains.length > 0) {
                detayText += `Web: ${info.domains.join(', ')}`;
              }
              if (info.socialMedia) {
                const socialMediaText = [];
                if (info.socialMedia.twitter) socialMediaText.push(`Twitter/X: ${info.socialMedia.twitter}`);
                if (info.socialMedia.instagram) socialMediaText.push(`Instagram: ${info.socialMedia.instagram}`);
                if (info.socialMedia.facebook) socialMediaText.push(`Facebook: ${info.socialMedia.facebook}`);
                if (socialMediaText.length > 0) {
                  detayText += `${info.domains && info.domains.length > 0 ? ' | ' : ''}${socialMediaText.join(', ')}`;
                }
              }
              li.textContent = detayText;
              ul.appendChild(li);
            }
            container.appendChild(ul);
          }
        }
        firmaListesiDiv.appendChild(container);
        trackEvent('Button Click', 'Show List', 'Clicked');
      }
    });
  });
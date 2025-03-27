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
          const anaBaslikDiv = document.createElement('div');
          anaBaslikDiv.className = 'ana-baslik accordion-header';
          const anaBaslik = document.createElement('h3');
          anaBaslik.textContent = anaFirma;
          anaBaslikDiv.appendChild(anaBaslik);
          container.appendChild(anaBaslikDiv);

          const anaIcerik = document.createElement('div');
          anaIcerik.className = 'accordion-content';
          anaIcerik.style.display = 'none'; // Varsayılan olarak kapalı
  
          for (const [kategori, altFirmalar] of Object.entries(detay.altFirmalar)) {
            const kategoriDiv = document.createElement('div');
            kategoriDiv.className = 'kategori-baslik accordion-header';
            const kategoriBaslik = document.createElement('h4');
            kategoriBaslik.textContent = kategori;
            kategoriDiv.appendChild(kategoriBaslik);
            anaIcerik.appendChild(kategoriDiv);

            const kategoriIcerik = document.createElement('div');
            kategoriIcerik.className = 'accordion-content';
            kategoriIcerik.style.display = 'none'; // Varsayılan olarak kapalı
  
            const ul = document.createElement('ul');
            ul.className = 'firma-list';
            for (const [altFirma, info] of Object.entries(altFirmalar)) {
              const li = document.createElement('li');
              const firmaDiv = document.createElement('div');
              firmaDiv.textContent = `${altFirma}:`;
              firmaDiv.className = 'firma-name';

              const detailsUl = document.createElement('ul');
              detailsUl.className = 'details-list';
  
              if (info.domains && info.domains.length > 0) {
                const webLi = document.createElement('li');
                const webIcon = document.createElement('i');
                webIcon.className = 'fas fa-globe';
                webLi.appendChild(webIcon);
                webLi.append(` Web: ${info.domains.join(', ')}`);
                detailsUl.appendChild(webLi);
              }
              if (info.socialMedia) {
                if (info.socialMedia.twitter) {
                  const twitterLi = document.createElement('li');
                  const twitterIcon = document.createElement('i');
                  twitterIcon.className = 'fab fa-x-twitter';
                  twitterLi.appendChild(twitterIcon);
                  twitterLi.append(` Twitter/X: ${info.socialMedia.twitter}`);
                  detailsUl.appendChild(twitterLi);
                }
                if (info.socialMedia.instagram) {
                  const instaLi = document.createElement('li');
                  const instaIcon = document.createElement('i');
                  instaIcon.className = 'fab fa-instagram';
                  instaLi.appendChild(instaIcon);
                  instaLi.append(` Instagram: ${info.socialMedia.instagram}`);
                  detailsUl.appendChild(instaLi);
                }
                if (info.socialMedia.facebook) {
                  const fbLi = document.createElement('li');
                  const fbIcon = document.createElement('i');
                  fbIcon.className = 'fab fa-facebook';
                  fbLi.appendChild(fbIcon);
                  fbLi.append(` Facebook: ${info.socialMedia.facebook}`);
                  detailsUl.appendChild(fbLi);
                }
              }
  
              firmaDiv.appendChild(detailsUl);
              li.appendChild(firmaDiv);
              ul.appendChild(li);
            }
            kategoriIcerik.appendChild(ul);
            anaIcerik.appendChild(kategoriIcerik);

            // Kategori için açılır/kapanır işlevsellik
            kategoriDiv.addEventListener('click', () => {
              const isOpen = kategoriIcerik.style.display === 'block';
              kategoriIcerik.style.display = isOpen ? 'none' : 'block';
              kategoriDiv.classList.toggle('open', !isOpen);
            });
          }
          container.appendChild(anaIcerik);

          // Tepe firma için açılır/kapanır işlevsellik
          anaBaslikDiv.addEventListener('click', () => {
            const isOpen = anaIcerik.style.display === 'block';
            anaIcerik.style.display = isOpen ? 'none' : 'block';
            anaBaslikDiv.classList.toggle('open', !isOpen);
          });

        }
        
        firmaListesiDiv.appendChild(container);
        trackEvent('Button Click', 'Show List', 'Clicked');
      }
    });
  });